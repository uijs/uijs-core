# Interaction

The `uijs.interaction` provides basic interaction capabilities to boxes.

## interaction.capture(el, fn)

Captures all mouse and touch events for an HTML element `el` and calls `fn(name, coords, evt)`
for each event captured.

Arguments to `fn`:

 * `name` - The name of the touch event: `touchstart`, `touchmove`, `touchend`.
 * `coords` - Relative coordinates of the touch event to the element's offset. In case of multiple
   touches, `coords` will include only the first touch. Use information from `evt` to extract
   multiple touches (for now).
 * `evt` - The original `TouchEvent` or `MouseEvent`.

Mouse events are translated into touch events as follows:

    onmousedown -> touchstart
    onmousemove -> touchmove
    onmouseup -> touchend

