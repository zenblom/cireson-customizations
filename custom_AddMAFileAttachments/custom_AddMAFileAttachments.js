/* ------------------------------------------------------- */
/* ----- Custom Add Manual Activity File Attachment ------ */
/* ------------------------------------------------------- */
// Tested with v8.4.3.2016 and Chrome v67 + IE11
// Author: Martin Blomgren, Innofactor
// Description: Lists File Attachments of Manual activities with ability to download.
// v0.1 initial release

//##################### CHANGE THESE VARIABLES TO MATCH YOUR SETTINGS #########################################//
var CustomManualActivityTypeProjection = '328e5ff5-cb6d-dfc9-7499-f0caad8a964e';
var debug = false;
//################# DO NOT EDIT BELOW IF YOU DONT KNOW WHAT YOU ARE DOING! ####################################//

// Add Manual Activity File Attachments to Form -- for Change Requests
app.custom.formTasks.add('ChangeRequest', null, function (formObj, viewModel) {
  formObj.boundReady(function () {
    if (session.user.Analyst) {
      AddMAFileAttachments(viewModel);
    }
  });
  return;
});

// Add Manual Activity File Attachments to Form -- for Service Requests
app.custom.formTasks.add('ServiceRequest', null, function (formObj, viewModel) {
  formObj.boundReady(function () {
    if (session.user.Analyst) {
      AddMAFileAttachments(viewModel);
    }
  });
  return;
});

// Add Manual Activity File Attachments to Form -- for Incidents
app.custom.formTasks.add('Incident', null, function (formObj, viewModel) {
  formObj.boundReady(function () {
    if (session.user.Analyst) {
      AddMAFileAttachments(viewModel);
    }
  });
  return;
});

function AddMAFileAttachments(viewModel) {

  var url = window.location.href;
  //The navigation node doesn't load immediately. Get the main div that definitely exists.
  var mainPageNode = document.getElementById('main_wrapper');

  // create an observer instance
  var mafaObserver = new MutationObserver(function (mutations) {
    //The page changed. See if our activity exists.
    var activityElement = $('div[data-activity-id]');

    var activityLength = viewModel.Activity.length;
    if (activityElement.length > 0 && activityLength == activityElement.length) { //An element with attribute of data-activity-id exists.
      activityElement.each(function (index, actElem) {
        var id = $(actElem).attr('data-activity-id');
        if (debug) console.log("Found activity: " + id);

        if (id.indexOf("MA") >= 0) {
          getActivityAttachments(id);
        }
      });

      //We are done observing.
      mafaObserver.disconnect();
    }

  });

  // configure the observer and start the instance.
  var observerConfig = { attributes: true, childList: true, subtree: true, characterData: true };
  mafaObserver.observe(mainPageNode, observerConfig);

  function getActivityAttachments(id) {
    // Add file attachments section to form
    var html =
      '<div class="col-group">' +
      '	<div>' +
      '		<div class="editor-label">' +
      '			<label><span>' + localization.FileAttachments + '</span></label>' +
      '		</div>' +
      '		<div class="editor-field custom-file-attachments-' + id + '">' +
      '		</div>' +
      '	</div>' +
      '</div>';
    $('div[data-activity-id="MA66"]').next('.activity-item-body').find('.activity-item-form').append(html);

    $.getJSON('/api/V3/Projection/GetProjection?id=' + id + '&typeProjectionId=' + CustomManualActivityTypeProjection, function (data) {
      // Add attachments to html here and perhaps a download button for each attachment
      if (debug) console.log(data.FileAttachment)

      // loop over the attachments
      $.each(data.FileAttachment, function (index, item) {
        if (debug) console.log("item", item);
        var filename = data.FileAttachment[index].DisplayName;
        var BaseId = data.FileAttachment[index].BaseId;
        var PropertyName = "Content";

        // Add attachment to section
        $('.editor-field.custom-file-attachments-' + id).append('<div><a data-filename="' + filename + '" data-baseid="' + BaseId + '" data-propertyname="' + PropertyName + '" class="attachment-download">' + filename + '</a></div>');
      });

      // Add eventhandler to button
      $('.attachment-download').click(function (e) {
        if (debug) console.log("button clicked", e);

        // Download attachment
        var filename = $(e.target).attr('data-filename');
        var BaseId = $(e.target).attr('data-baseid');
        var PropertyName = $(e.target).attr('data-propertyname');
        var url = '/api/V3/Projection/GetBase64String?BaseId=' + BaseId + '&PropertyName=' + PropertyName;
        $.getJSON(url, function (file) {

          if (debug) console.log("got base64 for " + filename, { base64: file });
          var contentType = "text/plain;charset=utf-8;";
          var blob = b64toBlob(file, contentType, 512, filename);
          var blobUrl = URL.createObjectURL(blob);

          if (debug) console.log("downloading " + filename, blobUrl);
          download(filename, blobUrl, blob);

        });
      });

    });
  }

  function b64toBlob(b64Data, contentType, sliceSize, filename) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);

      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, { type: contentType });
    if (debug) console.log("converted " + filename + " to blob", blob);
    return blob;
  }

  function download(filename, blobUrl, blob) {
    if (navigator.appVersion.toString().indexOf('.NET') > 0)
      window.navigator.msSaveBlob(blob, filename);
    else {
      var element = document.createElement('a');
      element.setAttribute('href', blobUrl);
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }
  }

}

/* ------------------------------------------------------- */
/* --- END Custom Add Manual Activity File Attachment ---- */
/* ------------------------------------------------------- */
