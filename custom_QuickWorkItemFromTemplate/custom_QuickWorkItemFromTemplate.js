/* ------------------------------------------------------- */
/* -------------- Custom Quick From Template ------------- */
/* ------------------------------------------------------- */
// Tested with portal v7.2.2016.1, v7.4.2016.1 & v8.1.0.2016
// Author: Martin Blomgren
// Description: Adds a custom add button to quickly create IR or SR from filtered templates in modal window.
// v0.2 Added possibility to filter templates dynamically based on analysts support group memberships name
// v0.1 Initial release

(function() {
//##################### CHANGE THESE VARIABLES TO MATCH YOUR SETTINGS #########################################//
var customServiceRequestArea = false;                // Use custom extended area for service requests
var ServiceRequestArea = "CustomArea";              // Custom extended area name

// only select one of the filter by analyst groups or text to true!!
var filterInNameOrDescription = "Name"              // SupportGroup or Keyword must exist in "Name" or "Description"
var filterTemplatesByAnalystGroups = true;          // Should we filter the templates by user group names, true/false
var filterTemplatesByText = false;                  // Should we filter the templates by keyword, true/false
var templateNameStartsWithFilter = "Servicedesk";   // Only return templates which starts with this text
//################# DO NOT EDIT BELOW IF YOU DONT KNOW WHAT YOU ARE DOING! ####################################//

    var quickCreateObserver = new MutationObserver(function (mutations) {
        var targetElements = $('#main_wrapper');
        if(targetElements.length > 0) {  
            ApplyStyleSheetQuickCreate();

            var quickButton = '<button type="button" class="btn btn-default btn-circle btn-lg" id="quickCreate"><i class="fa fa-plus" aria-hidden="true"></i></button>'
            $(body).append(quickButton);

            $('#quickCreate').click(function(e) {
				// load user supportgroups and pass into modal
				userSupportGroups().done(function(data) {
					ShowModalWindow(data);

				});
                
            });

            quickCreateObserver.disconnect(targetElements);
        }
    });
    // Notify me of everything!
    var observerConfig = {
        attributes: true,
        childList: false,
        characterData: false,
        subtree: true
    };

    // Node, config
    $(document).ready(function () {
        if (session.user.Analyst == 0 || window.innerWidth < 1000) {
        
            return;
        }

        var targetNode = document.getElementById('main_wrapper');
        quickCreateObserver.observe(targetNode, observerConfig);
    });
	
	var userSupportGroups = function() {
		return (function() {
			var groups =
			$.getJSON('/api/V3/User/GetUsersSupportGroupEnumerations', 
			{ 
				"id": session.user.Id 
			});

			return groups;
		})();		
	}

    var ShowModalWindow = function(groups) {
        //make a jQuery obj
        var template = GetHtmlTemplate();
        var cont = $($.parseHTML(template));
        
        //create a view model to handle the UX 
        var _vmWindow = new kendo.observable({ // TODO: remove global var when done testing
            successMsg: null,
            Templates: null,
            workitem: {},
            RequestedWorkItem: null,
            selectedSupportGroup: null,
            selectedCategory: null,
            supportGroupList: [],
            categoryList: [],
            AssignedWorkItem: null,
            valueChanged_Template : function(e) {
                var dataItem = e.sender.dataItem();						
            },            
            saveClick: function () {
                customWindow.close();
                app.lib.mask.apply();

                var workitem = this.get("workitem")
                workitem.RequestedWorkItem = this.get("RequestedWorkItem");
                workitem.AssignedWorkItem = this.get("AssignedWorkItem");
                switch (workitem.ClassName) {
                    case 'System.WorkItem.ServiceRequest':
                        workitem.SupportGroup.Id = this.get("selectedSupportGroup");
                        if(customServiceRequestArea) {
                            workitem[ServiceRequestArea].Id = this.get("selectedCategory");
                        } else {
                            workitem.Area.Id = this.get("selectedCategory");
                        }
                        break;

                    case 'System.WorkItem.Incident':
                        workitem.TierQueue.Id = this.get("selectedSupportGroup");
                        workitem.Classification.Id = this.get("selectedCategory");
                        break;
                }

                var strData = { "formJson":{ "current": workitem }};

                // save the filled out template as a new workitem
                $.ajax({
                    url: "/api/V3/Projection/Commit",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify(strData) ,
                    success: function (data2) {
                        app.lib.message.add(_vmWindow.successMsg + "&nbsp;&nbsp;<strong>" + workitem.Id + "</strong>", "success");
                        app.lib.message.show();
                    }
                });   
            }, 
            cancelClick: function () { 
                customWindow.close(); 
            }
        });

        //create the kendo window 
        customWindow = cont.kendoWindow({ 
            title: "Quick create from template", 
            resizable: false, 
            modal: true, 
            viewable: false, 
            width: 1500, 
            height: 1350, 
            close: function () {
                kendo.unbind(cont);
             }, 
            activate: function () { 
                //on window activate bind the view model to the loaded template content 
                kendo.bind(cont, _vmWindow); 
            },
            deactivate: function() {
                //Required, otherwise there will be problems when re-opening the window again.
                this.destroy();
            }	        
        }).data("kendoWindow"); 
        
        //now open the window 
        customWindow.open().center(); 

        //load templates grid
        var gridTemplate = $('.workitem-fromtemplate');
        var rowTemplate = $(gridTemplate.find("#rowTemplate"));
        var toolbarTemplate = $(gridTemplate.find("#toolbarTemplate"));
        var first = true;
        var gridEle = $(gridTemplate.find("[data-kendo-control='grid']")[0]);
        var grid = gridEle.kendoGrid({
            sortable: true,
            resizable: true,
            filterable: false,
            pageable: false,
            selectable: true,
            columns: [
                {
                    field: "name"
                }
            ],
            dataSource: null,
            toolbar: kendo.template(toolbarTemplate.html()),
            rowTemplate: kendo.template(rowTemplate.html()),
            height: 370,
            dataBinding: function(e) {
                if (first) {
                    //hide grid header
                    gridTemplate.find(".k-grid .k-grid-header").hide();

                    //add in localized search placeholder text
                    gridTemplate.find('#searchTemplates').attr("placeholder", localization.FilterTemplates);

                    //setup template filter
                    gridTemplate.find('#searchTemplates').keypress(function (event) {
                        var keycode = (event.keyCode ? event.keyCode : event.which);
                        if (keycode == '13') {
                            filterTemplates(grid, this);
                            return false;
                        }
                    });

                    gridTemplate.find('#searchFilter').click(function () {
                        filterTemplates(grid, gridTemplate.find('#searchTemplates'));
                    });

                    first = false;

                }
             
            }
        }).data("kendoGrid");
        gridEle.on("click", "td", function (e) {
            //create workitem from template
            var templateId = grid.dataItem($(e.target).closest('tr')).Id;
            createWorkItem(templateId);
        });

        //start loading all templates and set grid datasource
        $.when(
            //SR templates
            $.get('/api/V3/Template/GetTemplates?classId=04b69835-6343-4de2-4b19-6be08c612989'),

            //IRTemplates
            $.get('/api/V3/Template/GetTemplates?classId=a604b942-4c7b-2fb2-28dc-61dc6f465c68')
            
        ).then(function(srTemplates, irTemplates) {
            //join templates to a single array
            var templates = [];
            templates = (srTemplates[1] == "success") ? templates.concat(srTemplates[0]) : templates;
            templates = (irTemplates[1] == "success") ? templates.concat(irTemplates[0]) : templates;

            var newTemplates = [];
            // filter templates
            if (filterTemplatesByAnalystGroups) {
                for (i = 0; i < templates.length; i++) {
					for (j = 0; j < groups.length; j++) {
						if (templates[i][filterInNameOrDescription].lastIndexOf(groups[j].Name) != -1) {
							if (newTemplates.indexOf(templates[i]) == -1) {
								newTemplates.push(templates[i]);
							}
						}					
					}
                }
            } else if (filterTemplatesByText) {
                for (i = 0; i < templates.length; i++) {
                    if (templates[i].Name.lastIndexOf(templateNameStartsWithFilter, 0) === 0) {
                        newTemplates.push(templates[i]);
                    }
                }
            } else {
                newTemplates = templates;
            }

            //Add template to viewmodel
            _vmWindow.set('Templates', newTemplates);

            //add as data source to grid and update
            var dataSource = new kendo.data.DataSource({
                data: _vmWindow.Templates
            });                
            dataSource.read();
            grid.setDataSource(dataSource);
        });

        //helper function to filter on templates
        var filterTemplates = function (grid, input) {
            var searchText = $(input).val();

            grid.dataSource.query({
                filter: {
                    logic: "or",
                    filters: [
                        { field: "Name", operator: "contains", value: searchText },
                        { field: "Description", operator: "contains", value: searchText }
                    ]
                }
            });
        }

        //creates a workitem from a template
        var createWorkItem = function(templateId) {
            $.get('/api/V3/Projection/CreateProjectionByTemplate',
            {
                id: templateId,
                createdById: session.user.Id
            },
            function(data) {
                data.RequestedWorkItem = { BaseId: null, DisplayName: null };
                data.AssignedWorkItem = { BaseId: null, DisplayName: null };
                _vmWindow.set("workitem", data);
                _vmWindow.set("Description", data.Description);
                loadEnums(data.ClassName);

                // apply html template
                var templateEle = $(".quick-actions-box");
                app.controls.apply(templateEle, { localize: true, vm: _vmWindow, bind: true });

                //add current session user as analyst
                var au = $('[data-control-bind="AssignedWorkItem"]').data("kendoAutoComplete");
                au.dataSource.add(session.user);
                au.value(session.user.Name);
                au.trigger("change");


            });

            $('.workitem-content').show();
        }

        //load classification/area & tier/supportgroup enums and add to viewmodel
        var loadEnums = function(className) {
            var url = '/api/V3/Enum/GetFlatList/'
            var idCategory;
            var idSupportGroup;
            var filter = '';
            var parents = false

            switch (className) {
                case 'System.WorkItem.ServiceRequest':
                    idCategory = 'A16D4359-AB05-5200-D965-B33C281D603C';
                    idSupportGroup = '23c243f6-9365-d46f-dff2-03826e24d228';
                    _vmWindow.set("selectedCategory", (customServiceRequestArea) ? _vmWindow.workitem[ServiceRequestArea].Id : _vmWindow.workitem.Area.Id);
                    _vmWindow.set("selectedSupportGroup", _vmWindow.workitem.SupportGroup.Id);
                    _vmWindow.set("successMsg", localization.ServiceRequestCreated);
                    break;

                case 'System.WorkItem.Incident':
                    idCategory = '1f77f0ce-9e43-340f-1fd5-b11cc36c9cba';
                    idSupportGroup = 'c3264527-a501-029f-6872-31300080b3bf';
                    _vmWindow.set("selectedCategory", _vmWindow.workitem.Classification.Id);
                    _vmWindow.set("selectedSupportGroup", _vmWindow.workitem.TierQueue.Id);
                    _vmWindow.set("successMsg", localization.IncidentCreated);
                    break;
            }

            //load category enums into viewmodel
            getEnum(idCategory).done(function(data) {
                _vmWindow.set("categoryList", data);

            });

            // load supportgroup enums into viewmodel
            getEnum(idSupportGroup).done(function(data) {
                _vmWindow.set("supportGroupList", data);

            });
        }

        var getEnum = function(id) {
            return (function() {
                var enumList =
                $.get('/api/V3/Enum/GetFlatList/',
                {
                    id: id,
                    itemFilter: '',
                    includeParents: true
                });

                return enumList;
            })();
        }
    }

    var GetHtmlTemplate = function() {
        var template =  
        '<div>' +
            '<div id="quickfromtemplate" class="form-horiztontal">' +
                '<div class="row">' +

                    '<div class="col-md-4">' +
                        '<div class="workitem-fromtemplate">' +
                            '<span class="drawerdetails-heading" data-localize="Templates"></span>' +
                            '<table data-kendo-control="grid">' +

                                '<tbody></tbody>' +
                            '</table>' +

                            '<script id="rowTemplate" type="text/x-kendo-tmpl">' +
                                '<tr>' +
                                    '<td class="templatename">' +
                                        '<strong>#: Name #</strong>' +
                                        '<div>#: (Description == null) ? \' \' : Description #</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</script>' +

                            '<script id="toolbarTemplate" type="text/x-kendo-templ">' +
                                '<span class="k-textbox k-space-right pad0">' +
                                    '<input type="text" id="searchTemplates" />' +
                                    '<a href="javascript:void(0)" id="searchFilter" class="k-icon k-i-search"></a>' +
                                '</span>' +
                            '</script>' +
                        '</div>' +
                    '</div>' + //.col-md-4

                    '<div class="col-md-8">' +
                        '<div class="workitem-content" style="display: none;">' +

                            '<div class="quick-actions-box">' +
                                // Title
                                '<div class="row">' +
                                    '<div class="col-md-12">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="Title"></label> <span id="TitleVal" style="display:none" class="error">*</span>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<input class="k-textbox" data-bind="value: workitem.Title" type="text">' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                // Description
                                '<div class="row">' +
                                    '<div class="col-md-12">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="Description"></label>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<textarea data-bind="value: workitem.Description" class="form-control" rows="3"></textarea>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                // Affected User & Alternate contact method
                                '<div class="row">' +
                                    '<div class="col-md-4">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="AffectedUser"></label>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<script>' +
                                                    'app.controls.filters.add("affectedUsers", function () {' +
                                                        'return {' +
                                                            'userFilter: $("[data-control-bind=\'RequestedWorkItem\']").data("kendoComboBox").input.val()' +
                                                        '};' +
                                                    '});' +
                                                '</script>' +
                                                '<input data-control="userPicker" data-bind="value: RequestedWorkItem" data-control-bind="RequestedWorkItem" data-control-filter="affectedUsers">' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-md-8">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="Alternatecontactmethod"></label>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<input data-bind="value: workitem.ContactMethod" class="k-textbox" type="text">' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                // Category (classification/area), Support Group & Assigned User
                                '<div class="row">' +
                                    '<div class="col-md-4">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="Category"></label>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<select data-value-primitive="true" data-value-field="Id" data-text-field="Name" data-bind="value: selectedCategory, source: categoryList" class="form-control"></select>' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-md-4">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="SupportGroup"></label>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<select data-value-primitive="true" data-value-field="Id" data-text-field="Name" data-bind="value: selectedSupportGroup, source: supportGroupList" class="form-control"></select>' +
                                            '</div>' +                         
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-md-4">' +
                                        '<div class="form-group">' +
                                            '<div class="editor-label">' +
                                                '<label data-localize="AssignedTo"></label>' +
                                            '</div>' +
                                            '<div class="editor-field">' +
                                                '<script>' +
                                                    'app.controls.filters.add("assignedUsers", function () {' +
                                                        'return {' +
                                                            'userFilter: $("[data-control-bind=\'AssignedWorkItem\']").data("kendoComboBox").input.val()' +
                                                        '};' +
                                                    '});' +
                                                '</script>' +
                                                '<input data-control="userPicker" data-bind="value: AssignedWorkItem" data-control-bind="AssignedWorkItem" data-control-filterbyanalyst="true" data-control-filter="assignedUsers">' +
                                            '</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +

                            '</div>' + //.quick-actions-box

                        '</div>' + //.workitem-content
                    '</div>' + //.col-md-8


                '</div>' + //.row

                '<div class="window-buttons">' +
                    '<button data-role="button" class="btn btn-primary" data-bind="enabled: okEnabled, events: { click: saveClick }">Save</button> ' +
                    '<button data-role="button" class="btn btn-primary" data-bind="events: { click: cancelClick }">Cancel</button>' +
                '</div>' +
            '</div>' + //#quickfromtemplate
        '</div>'; //Empty div
        return template;
    }



    function ApplyStyleSheetQuickCreate() {
        var addRule = (function(style){
            var sheet = document.head.appendChild(style).sheet;
            return function(selector, css){
                var propText = Object.keys(css).map(function(p){
                    return p+":"+css[p]
                }).join(";");
                sheet.insertRule(selector + "{" + propText + "}", sheet.cssRules.length);
            }
        })(document.createElement("style"));

        addRule(".workitem-fromtemplate td.templatename", {
            "padding": "12px 15px",
            "cursor": "pointer"
        });

        addRule(".workitem-fromtemplate .k-grid-content", {
            "border": "1px solid #a3b8c3"
        });

        addRule('#quickfromtemplate .workitem-content', {
            "padding-right": "30px"
        });

        addRule('#quickfromtemplate .workitem-content input, #quickfromtemplate .workitem-content select, #quickfromtemplate .workitem-content textarea, #quickfromtemplate .workitem-content span.k-widget.k-autocomplete.k-header.k-state-default', {
            "border-radius": "0 !important"
        });

        addRule("#quickfromtemplate .workitem-content .btn", {
            "background-color": "#e3eaed !important",
            "border-color": "#a3b8c2 !important",
            "margin-bottom": "10px"
        });

        addRule('#quickfromtemplate .workitem-content select', {
            "box-sizing": "border-box",
            "padding": "5px 10px"
        });

        addRule('#quickfromtemplate .workitem-content textarea', {
            "padding": "0"
        });

        addRule('#quickfromtemplate div[class^="col-md-"]', {
            "box-sizing": "border-box !important"
        });

        addRule('#quickfromtemplate .workitem-content div[class^="col-md-"]', {
            "padding-left": "15px !important",
            "padding-right": "15px !important"
        });

        // TESTING ROUND QUICK BTN
        addRule('.btn-circle.btn-lg', {
            "border": "none",
            "width": "50px",
            "height": "50px",
            "padding": "10px 16px",
            "font-size": "18px",
            "line-height": "1.33",
            "border-radius": "25px !important",
            "box-shadow": "0 1px 1.5px 0 rgba(0,0,0,.12), 0 1px 1px 0 rgba(0,0,0,.24)"
        });

        addRule('#quickCreate', {
            "position": "fixed",
            "right": "10px",
            "bottom": "60px",
            "z-index": "4000",
            "background": "#ff8b02 !important",
            "color": "#fff !important"
        });

        addRule('#quickCreate:hover', {
            "background": "#FF8B5E !important",
            "color": "#fff"
        });

        // END TEST QUICK BTN
    }
})();
/* ------------------------------------------------------- */
/* -----------End Custom Quick From Template ------------- */
/* ------------------------------------------------------- */
