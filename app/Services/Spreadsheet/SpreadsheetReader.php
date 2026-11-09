<?php

namespace App\Services\Spreadsheet;

use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Reads the first sheet of a .csv or .xlsx file into a list of rows (arrays of strings).
 * Dependency-free: CSV via fgetcsv (UTF-8, BOM-aware, , or ; delimiter), XLSX via ZipArchive + SimpleXML.
 */
class SpreadsheetReader
{
    /**
     * @return array<int, list<string>> rows keyed by their 1-based line number in the file (blank rows removed)
     */
    public static function read(string $path, string $extension, int $maxRows = 5000): array
    {
        $rows = match (strtolower($extension)) {
            'csv', 'txt' => self::readCsv($path, $maxRows),
            'xlsx' => self::readXlsx($path, $maxRows),
            default => throw new RuntimeException('Unsupported file type. Please upload a .csv or .xlsx file.'),
        };

        // Drop fully empty rows and trailing empty cells, keeping the original line numbers.
        $rows = array_combine(range(1, max(1, count($rows))), $rows ?: [[]]);

        return array_filter(array_map(function (array $row) {
            $row = array_map(fn ($v) => trim((string) $v), $row);
            while ($row && end($row) === '') {
                array_pop($row);
            }

            return $row;
        }, $rows), fn ($row) => count($row) > 0);
    }

    protected static function readCsv(string $path, int $maxRows): array
    {
        $handle = fopen($path, 'rb');
        if (! $handle) {
            throw new RuntimeException('Could not open the file.');
        }

        $first = fgets($handle) ?: '';
        $first = preg_replace('/^\xEF\xBB\xBF/', '', $first);
        $delimiter = substr_count($first, ';') > substr_count($first, ',') ? ';' : ',';
        rewind($handle);

        // Skip BOM
        if (fread($handle, 3) !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $rows = [];
        while (($row = fgetcsv($handle, 0, $delimiter, '"', '')) !== false && count($rows) < $maxRows + 1) {
            if ($row === [null]) {
                $rows[] = []; // keep line numbers aligned with the file

                continue;
            }
            $rows[] = array_map(fn ($v) => self::toUtf8((string) $v), $row);
        }
        fclose($handle);

        return $rows;
    }

    protected static function toUtf8(string $value): string
    {
        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        // Excel on Windows sometimes saves Arabic CSVs as Windows-1256.
        $converted = @iconv('Windows-1256', 'UTF-8//IGNORE', $value);

        return $converted !== false ? $converted : mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1');
    }

    protected static function readXlsx(string $path, int $maxRows): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new RuntimeException('This doesn’t look like a valid Excel (.xlsx) file.');
        }

        $sharedStrings = [];
        if (($xml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            $sst = self::xml($xml);
            foreach ($sst->si as $si) {
                $sharedStrings[] = self::inlineText($si);
            }
        }

        $sheetPath = self::firstSheetPath($zip);
        $sheetXml = $zip->getFromName($sheetPath);
        $zip->close();

        if ($sheetXml === false) {
            throw new RuntimeException('The Excel file has no worksheet.');
        }

        $sheet = self::xml($sheetXml);
        $rows = [];

        foreach ($sheet->sheetData->row as $row) {
            if (count($rows) > $maxRows) {
                break;
            }

            $values = [];
            foreach ($row->c as $cell) {
                $index = self::columnIndex((string) $cell['r']) ?? count($values);
                $type = (string) $cell['t'];

                $value = match ($type) {
                    's' => $sharedStrings[(int) $cell->v] ?? '',
                    'inlineStr' => self::inlineText($cell->is),
                    'b' => ((string) $cell->v) === '1' ? '1' : '0',
                    default => self::number((string) $cell->v),
                };

                for ($i = count($values); $i < $index; $i++) {
                    $values[$i] = '';
                }
                $values[$index] = $value;
            }

            $rowIndex = (int) $row['r'] - 1;
            for ($i = count($rows); $rowIndex > 0 && $i < $rowIndex; $i++) {
                $rows[$i] = [];
            }
            $rows[] = $values;
        }

        return $rows;
    }

    protected static function firstSheetPath(ZipArchive $zip): string
    {
        $workbook = $zip->getFromName('xl/workbook.xml');
        $rels = $zip->getFromName('xl/_rels/workbook.xml.rels');

        if ($workbook !== false && $rels !== false) {
            $wb = self::xml($workbook);
            $relsXml = self::xml($rels);
            $firstSheet = $wb->sheets->sheet[0] ?? null;

            if ($firstSheet) {
                $rid = (string) $firstSheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
                foreach ($relsXml->Relationship as $rel) {
                    if ((string) $rel['Id'] === $rid) {
                        $target = ltrim((string) $rel['Target'], '/');

                        return str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
                    }
                }
            }
        }

        return 'xl/worksheets/sheet1.xml';
    }

    protected static function xml(string $content): SimpleXMLElement
    {
        $xml = simplexml_load_string($content, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
        if ($xml === false) {
            throw new RuntimeException('The Excel file could not be read.');
        }
        // Use the default namespace transparently.
        $namespaces = $xml->getDocNamespaces();
        if (isset($namespaces[''])) {
            $xml->registerXPathNamespace('x', $namespaces['']);
        }

        return $xml;
    }

    protected static function inlineText(?SimpleXMLElement $node): string
    {
        if ($node === null) {
            return '';
        }
        if (isset($node->t)) {
            return (string) $node->t;
        }
        $text = '';
        foreach ($node->r as $run) {
            $text .= (string) $run->t;
        }

        return $text;
    }

    /** Excel stores 3.5 as "3.5" and sometimes 3.4999999999 — tidy floats, keep text as is. */
    protected static function number(string $value): string
    {
        if (is_numeric($value) && str_contains(strtolower($value), 'e') === false && str_contains($value, '.')) {
            return rtrim(rtrim(number_format((float) $value, 6, '.', ''), '0'), '.');
        }

        return $value;
    }

    protected static function columnIndex(string $ref): ?int
    {
        if (! preg_match('/^([A-Z]+)/', $ref, $m)) {
            return null;
        }
        $index = 0;
        foreach (str_split($m[1]) as $char) {
            $index = $index * 26 + (ord($char) - 64);
        }

        return $index - 1;
    }
}
