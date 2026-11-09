/**
 * Food photos used in the website's illustrations (hero phone, feature cards, Plate Story, login screen).
 * Free to use under the Unsplash License (https://unsplash.com/license) and served from Unsplash's CDN,
 * as Unsplash recommends. Swap any of these for your own photos by changing the URL.
 */
const unsplash = (id: string, w: number, h: number) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=70&auto=format`;

export const DEMO_PHOTOS = {
    // Yoav Aziz — https://unsplash.com/photos/422N7Nwq5XY
    shakshuka: unsplash('photo-1590412200988-a436970781fa', 160, 160),
    shakshukaStory: unsplash('photo-1590412200988-a436970781fa', 540, 960),
    // Unsplash — https://unsplash.com/photos/stainless-steel-fork-and-knife-on-white-ceramic-plate (photo-1588503812457)
    emptyPlateStory: unsplash('photo-1588503812457-f289d7f27314', 540, 960),
    // Ajeet Panesar — flatbread
    manakish: unsplash('photo-1655979284091-eea0e93405ee', 160, 160),
    // Tirth Patel — glass of milky chai
    karak: unsplash('photo-1792143663827-c77f1c1f2d71', 160, 160),
};

/** An <img> that quietly hides itself if the photo can't load, leaving the coloured placeholder behind it. */
export const hideOnError = (e: { currentTarget: HTMLImageElement }) => {
    e.currentTarget.style.display = 'none';
};
