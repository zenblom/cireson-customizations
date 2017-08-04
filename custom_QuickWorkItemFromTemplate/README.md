# Custom Quick From Template

Adds a custom add button to quickly create IR or SR from filtered templates in modal window.

![Demo](zenblom.github.com/zenblom.github.io/QuickWorkItemFromTemplate.gif)

Tested with portal v7.2.2016.1, v7.4.2016.1 & v8.1.0.2016

**Not working in v8.0.20xx.6 due to broken api endpoint**

## Installation
Drop the `custom_QuickWorkItemFromTemplate.js` file in C:\inetpub\CiresonPortal\CustomSpace\ folder and load it by adding `$.getScript("/CustomSpace/custom_QuickWorkItemFromTemplate.js");` into the `custom.js` file.

## Configuration
Open up the custom .js file where the settings should be explained.

If using the default filter by support group make sure that the templates being used has the support group names in the Name OR Description. It is possible to use one template for mulitple support groups I.e. "Tier 1 Tier 2 - Generic Incident".

## Changelog
* **v0.2** Added possibility to filter templates dynamically based on analysts support group memberships name
* **v0.1** Initial release
