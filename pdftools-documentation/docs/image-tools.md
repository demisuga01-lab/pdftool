# Image Tools

## Purpose

Document the current image-related tool set and its implementation boundaries.

## Audience

- Developers
- QA
- Support staff

## Implemented Image Tool Set

- Resize image
- Batch resize
- Rotate image
- Crop image
- Watermark image
- Image info
- Remove background
- Shared convert/compress/OCR routes for image workflows

## Resize Image

- Route: `/image/resize`
- Endpoint: `POST /api/image/resize`
- Worker: `resize_image_task`
- Service: `ImageService.resize_image`
- Dependency: `pyvips`

Implemented controls:

- width and height
- fit mode
- kernel
- without enlargement / allow upscale
- quality
- output format
- background for padded modes
- percentage mode via form mapping

## Batch Resize

- Route: `/image/batch-resize`
- Endpoint: `POST /api/image/batch-resize`
- Worker: `batch_resize_task`
- Service: `ImageService.batch_resize`

Behavior:

- supports multiple images or a ZIP archive
- ZIP extraction applies archive safety checks
- result is a ZIP of resized outputs

Known limitation:

- some naming and formatting options shown in UI are not used by backend

## Rotate Image

- Route: `/image/rotate`
- Endpoint: `POST /api/image/rotate`
- Worker: `rotate_image_task`
- Service: `ImageService.rotate_image`

Behavior:

- right-angle rotation path uses `pyvips`
- arbitrary rotation uses `convert`
- supports flip horizontal and flip vertical

## Crop Image

- Route: `/image/crop`
- Endpoint: `POST /api/image/crop`
- Worker: `crop_image_task`
- Service: `ImageService.crop_image`

Behavior:

- direct drag crop box
- eight drag handles
- numeric X/Y/Width/Height sync with preview box

## Watermark Image

- Route: `/image/watermark`
- Endpoint: `POST /api/image/watermark`
- Worker: `watermark_image_task`
- Service: `ImageService.watermark_image`
- Dependencies: `Pillow`, `inkscape`, `convert` fallback

Behavior:

- text and image watermark
- visual drag placement
- relative coordinates for export
- opacity, rotation, width scaling
- tiled watermark option

## Image Info

- Route: `/image/info`
- Endpoint: `POST /api/image/info`
- Service: `ImageService.get_image_info`
- Dependency: `pyvips`

Reported fields include:

- width
- height
- format/loader
- size bytes
- bands
- interpretation

## Remove Background

- Route: `/image/remove-background`
- Endpoint: `POST /api/image/remove-background`
- Worker: `remove_background_task`
- Service: `ImageService.remove_background`
- Dependencies: `opencv`, `numpy`

Implemented behavior:

- GrabCut-style foreground extraction
- PNG output with alpha

Known limitation:

- advanced UI options are currently not consumed by backend

## Shared Image Route Wrappers

- `/image/compress` -> redirect to `/compress?type=image`
- `/image/convert` -> redirect to `/convert?from=image`
- `/image/ocr` -> redirect to `/tools/ocr?input=image`

## Related Documents

- [conversion.md](./conversion.md)
- [compression.md](./compression.md)
- [watermarking.md](./watermarking.md)
- [known-limitations.md](./known-limitations.md)

