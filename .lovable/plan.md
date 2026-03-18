

## SpecViewer Improvements

After reviewing the current implementation, here are the key improvements worth making:

### 1. Text highlight on canvas for search matches
Currently search navigates to the correct page but doesn't visually highlight where the match is. Using pdf.js `getTextContent()` with item positions, we can draw highlight rectangles over matched text on the canvas after rendering.

### 2. Scroll wheel zoom
Users expect pinch/scroll-to-zoom in a document viewer. Add a `wheel` event listener on the container that adjusts scale when Ctrl/Cmd is held.

### 3. Direct page number input
The page indicator (`12 / 450`) is read-only. Make it a click