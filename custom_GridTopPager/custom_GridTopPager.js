//#########################################################//
/* ------------------------------------------------------- */
/* ----------- Custom Add Top Pager To Grid  ------------- */
/* ------------------------------------------------------- */
// Tested with portal v8.2.0.2016
// Contributors: Martin Blomgren
// Description: Add top pager to built in views with grid.
// v0.1 initial release

(function() { // Avoid Global variables where we can!
    $(document).ready(function () {

        var url = window.location.href;
        
		// Verify we are on builtin page with a gridview.
        if(url.indexOf("/View/") > -1 || url.indexOf("/c5161e06-2378-4b44-aa89-5600e2d3b9d8") > -1 || 
			url.indexOf("/9a06b0af-2910-4783-a857-ba9e0ccb711a") > -1 || url.indexOf("/cca5abda-6803-4833-accd-d59a43e2d2cf") > -1 || 
			url.indexOf("/f94d43eb-eb42-4957-8c48-95b9b903c631") > -1 || url.indexOf("/62f452d5-66b5-429b-b2b1-b32d5562092b") > -1) { 
            //The navigation node doesn't load immediately. Get the main div that definitely exists.
            var mainPageNode = document.getElementById('main_wrapper');
            
            // create an observer instance
            var topPagerObserver = new MutationObserver(function(mutations) {
                //The page changed. See if our title exists. If it does, then our gridview should also exist.
                var titleElement = $(".page_title"); //The title always exists. If this page has a gridview, then it also exists as soon as the title does.
                
                if (titleElement.length > 0) { //An element with class of page_title exists.
                    var gridElement = $('[data-role=grid]') // Get the grid object
                    if (gridElement.length > 0) {
                        AddTopPagerToGrid(gridElement);
                    }
                    
                    //We are done observing.
                    topPagerObserver.disconnect();
                }
                
            });
            
            // configure the observer and start the instance.
            var observerConfig = { attributes: true, childList: true, subtree: true, characterData: true };
            topPagerObserver.observe(mainPageNode, observerConfig);
        }
    });

    var AddTopPagerToGrid = function(gridElement) {

        var kendoGridElement = gridElement.data('kendoGrid'); //...as a kendo widget
        
		var wrapper = $('<div class="k-pager-wrap k-grid-pager pagerTop"/>').insertBefore(kendoGridElement.element.children("table"));
		kendoGridElement.pagerTop = new kendo.ui.Pager(wrapper, $.extend({}, kendoGridElement.options.pageable, { dataSource: kendoGridElement.dataSource }));
    }

})(); // the parentese here cause the anonymous function to execute and return


/* ------------------------------------------------------- */
/* ----------- Custom Add Top Pager To Grid  ------------- */
/* ------------------------------------------------------- */
