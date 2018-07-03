# Custom Manual Activity File Attachments

Adds a section in manual activities with the related file attachments as downloadable links.

![Demo](https://zenblom.github.io/custom_AddMAFileAttachments.png)

Tested with portal v8.4.3.2016 and Chrome v67 + IE11.

## Installation
Drop the `custom_AddMAFileAttachments.js` file in C:\inetpub\CiresonPortal\CustomSpace\ folder and load it by adding `$.getScript("/CustomSpace/custom_AddMAFileAttachments.js");` into the `custom.js` file.

You need the Type Projection and forms extension found here: https://www.scutils.com/blog/scutils-blog/system-center-2012-service-manager/related-items-for-manual-activities which is also provided compiled into a SCSM 2016 compatible .mpb in this repo.

## Configuration
If you are using another Type Projection for the related items you need to update the custom script variable in the beginning with the ID.

## Changelog
* **v0.1** Initial release
