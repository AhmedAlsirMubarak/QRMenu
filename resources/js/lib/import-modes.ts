export const IMPORT_MODES = {
    add: { title: 'Add new dishes', text: 'Every row becomes a new dish. Rows already on your menu are flagged.' },
    update: { title: 'Update existing dishes', text: 'Change prices, names or availability. Matched by SKU, or by category + name.' },
    upsert: { title: 'Add & update', text: 'Update dishes that match, add the rest. Best for keeping a master spreadsheet.' },
} as const;
