/**
GeoSIMS functions.js
**/
//Required Dojo components
dojo.require("esri.map");
dojo.require("esri.tasks.query");
dojo.require("esri.layers.FeatureLayer");
dojo.require("esri.dijit.Popup");
dojo.require("esri.dijit.Scalebar");
dojo.require("esri.dijit.Measurement");
dojo.require("esri.dijit.Bookmarks");
dojo.require("esri.SnappingManager");
dojo.require("dijit.dijit");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.grid.cells.dijit");
dojo.require("dojo.parser");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dojo.hash");
dojo.require("dojox.data.QueryReadStore");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.AccordionContainer");
dojo.require("dijit.TitlePane");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.form.SimpleTextarea");
dojo.require("dijit.Menu");
dojo.require("dijit.Dialog");
dojo.require("dijit.TooltipDialog");
dojo.require('dojox.charting.Chart2D');
dojo.require("dojox.charting.themes.Distinctive");
dojo.require("dojox.charting.action2d.Highlight");
dojo.require("dojox.charting.action2d.Tooltip");
dojo.require("dijit._WidgetBase");

//Define global variables
var gridRoom, gridRoom_store, gridRoom_storeEmpty;
var gridRA, gridRA_store, gridRA_storeEmpty;
var gridRAU, gridRAU_store, gridRAU_storeEmpty;
var gridRAO, gridRAO_store, gridRAO_storeEmpty;
var gridBdgt, gridBdgt_store, gridBdgt_storeEmpty;
var qStore_org,qStore_emp, qStore_bdgt;
var floorChart, floorChartLegend;
var map, roomsServiceLayer, backgroundServiceLayer;
var visible = [];
var roomsGraphicsLayer, roomInfoGraphicsLayer, facsGraphicsLayer, infoTemplate;
var facNum = '', floor = '';
var currentAnchor = null;  //Last checked anchor value
var authz = {}, netid = '';
var currentFacExtent = {};
var classSel, classSelOnChange;
var roomHoverTimer_in, roomHoverTimer_out;
var bookmarks;

//When HTML and Dojo loads..
function dojoOnLoad() {
	setCustomClasses();

	//Set proxy variables
	//esri.config.defaults.io.proxyUrl = "mapviewer/php/proxy.php";
	//esri.config.defaults.io.alwaysUseProxy = false;

	/**
	function myCallbackFunction(ioArgs) {
    console.log(ioArgs);
		var requestServiceURL = ioArgs.url;
		var proxyUrlLength = esri.config.defaults.io.proxyUrl.length;
		if (requestServiceURL.substr(0,proxyUrlLength) == esri.config.defaults.io.proxyUrl && requestServiceURL.indexOf('geosims.cpo.uw.edu',proxyUrlLength) == -1) {
			ioArgs.url = requestServiceURL.substr(proxyUrlLength + 1);
			console.log(ioArgs.url);
		}

    return ioArgs;
  }

  // where the argument ioArgs is of type: dojo.__XhrArgs (or) dojo.io.script.__ioArgs
  esri.setRequestPreCallback(myCallbackFunction);
	**/

	helpTooltip = new CustomDynamicTooltip({
    connectId: [],
    label: "",
    definitions:dataDefinitions.columns,
    defClassAttr:"data-sims-helpClass",
    defValueAttr:"data-sims-helpValue"
  });

	//Initialize infoWindow popup
	var popup = new esri.dijit.Popup(null, dojo.create("div"));

	//Define custom map extent
	//Currently: UW Seattle
	var startExtent = new esri.geometry.Extent(-13616761.863110848,6048279.3671294805,-13613059.444553185,6051007.213576479, new esri.SpatialReference({wkid:3857}));

	//Initialize map variable
	map = new esri.Map("mapDiv", {
		extent: startExtent,
		logo:false,
		infoWindow:popup,
		"fadeOnZoom": true,
          "force3DTransforms": true,
          "navigationMode": "css-transforms"
	});

	//Place the popup under the map's root element. This ensures that the coordinate space used by the popup for positioning aligns with the map's coordinate space.
	dojo.place(popup.domNode, map.root);

	//initialize infoWindow variables
	map.infoWindow.resize(575,350);
	map.infoWindow.setContent(dojo.byId("infoWindowDiv"));
	//Hide map infoWindow when escape key is hit
	dojo.connect (map, "onKeyDown", function (key){
		if (key.keyCode == 27) { //Esc key
			map.infoWindow.hide();
		}
	});
	dojo.style("titleContainer","display","inline");
	dojo.style("summaryContainer","display","inline");
	dojo.style("infoWindowDiv","display","inline");
	dojo.style("mapDiv","border","solid 4px #333");
	dojo.style(dijit.byId("titlePane").containerNode,"backgroundColor","#eee");

	//Create room symbol definitions
	roomInfoSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
		new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([240,0,0,0.75]), 3),
		new dojo.Color([240,0,0,0.30]));
	highlightSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
		new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,0]), 3),
		new dojo.Color([104,104,104,0.30]));
	symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
		new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([176,176,176,0.5]), 1),
		new dojo.Color([255,255,255,0]));
	//TO DO: Replace errorSymbol with PictureFillSymbol, red lines?
	errorSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_FORWARD_DIAGONAL,
		new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASH, new dojo.Color([255,0,0,1]), 2),
		new dojo.Color([255,50,50,.5]));
	facSelSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
    new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([98,194,204]), 2),
    new dojo.Color([98,194,204,0.75]));

	//Define ArcGIS Server service layers
	esri.config.defaults.geometryService = new esri.tasks.GeometryService("https://geosims.cpo.uw.edu/arcgis/rest/services/Utilities/Geometry/GeometryServer");
	roomsServiceLayer = new esri.layers.ArcGISDynamicMapServiceLayer("https://geosims.cpo.uw.edu/arcgis/rest/services/pubFloorplans/MapServer");
	roomsFeatureLayer = new esri.layers.FeatureLayer("https://geosims.cpo.uw.edu/arcgis/rest/services/pubFloorplans/MapServer/1", {
		mode: esri.layers.FeatureLayer.MODE_SNAPSHOT,
		id:"gfxLayer_rooms",
		outFields: ["SPACEID", "ROOMNUMBER"]
	});
	roomsFeaturesRenderer = new esri.renderer.SimpleRenderer(symbol);
	roomsFeatureLayer.setRenderer(roomsFeaturesRenderer);
	roomsFeatureLayer.setDefinitionExpression("BUILDINGID = '' AND FLOORCODE = ''");

	backgroundServiceLayer = new esri.layers.ArcGISTiledMapServiceLayer("https://geosims.cpo.uw.edu/arcgis/rest/services/Wayfinding/Basemap/MapServer");

	basemap =  new esri.layers.ArcGISTiledMapServiceLayer("https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer");

	facQueryTask = new esri.tasks.QueryTask("https://geosims.cpo.uw.edu/arcgis/rest/services/Wayfinding/Basemap/MapServer/46");

	//Connect layers to events
	dojo.connect(roomsServiceLayer, "onError", function(error) {
		console.log("roomsServiceLayer onError: ", error);
		postClientMessage({
			text:"Error loading floor plan layer",
			type:"layerError"
		});
	});

	dojo.connect(roomsFeatureLayer, "onUpdateEnd", function() {
		//Set extent for 'Current Facility' bookmark
		if (roomsFeatureLayer.graphics.length > 0) {
  		var extent = esri.graphicsExtent(roomsFeatureLayer.graphics);
  		if (extent) {
    		bookmarks[0].extent.xmin = extent.xmin;
    		bookmarks[0].extent.ymin = extent.ymin;
    		bookmarks[0].extent.xmax = extent.xmax;
    		bookmarks[0].extent.ymax = extent.ymax;
    	}
    } else {
    	//If floor code is in floor select, make error message
    	if (floor == dijit.byId('floorSelect').value && (facNum != '' && floor != '')) {
    		//console.log(roomsFeatureLayer.graphics, floor, dijit.byId('floorSelect').value);
      	postClientMessage({
  				text:"No rooms in floor plan " + facNum + '-' + floor,
  				type:"layerError"
  			});
			}
			//Set 'Current Facility' bookmark to current map extent
    	bookmarks[0].extent.xmin = map.extent.xmin;
      bookmarks[0].extent.ymin = map.extent.ymin;
      bookmarks[0].extent.xmax = map.extent.xmax;
      bookmarks[0].extent.ymax = map.extent.ymax;
    }

		//Check to see if rooms should be classified on update end
		if (currentRoomClassification["RETURN"] && currentRoomClassification["WHERE"]) {
			//Update query to current facNum and floor
			currentRoomClassification["WHERE"]["ANDS"]["FACNUM"] = facNum;
			currentRoomClassification["WHERE"]["ANDS"]["R.FLOOR_CODE"] = floor;
			getRoomAttribute(currentRoomClassification["RETURN"],currentRoomClassification["WHERE"],null);
		} else {
			dojo.byId("legend").innerHTML = '';
			dojo.style("legend_container","display","none");
		}
	});

	//dojo.connect(backgroundServiceLayer, "onLoad", buildLayerList_bg);
	dojo.connect(roomsServiceLayer, "onUpdateStart", function() { //Connect to layer onUpdateStart event
		//dojo.byId("info").innerHTML = "Loading floor...";
		esri.show(dojo.byId("loadingImg"));
	});
	dojo.connect(roomsServiceLayer, "onUpdateEnd", function(error) { //Connect to layer onUpdateEnd event
		if (error) {
			//dojo.byId("info").innerHTML = "Error loading floor.";
			console.log("Error loading floor plan layer: ", error);
		} else {
			//dojo.byId("info").innerHTML = "Floor loaded.";
			esri.hide(dojo.byId("loadingImg"));
			//console.log('facsgraphicslayer', facsGraphicsLayer, typeof facsGraphicsLayer == "undefined");
			if (typeof facsGraphicsLayer != "undefined") facsGraphicsLayer.clear(); //Clear any facility selection graphics
		}
	});

	//Set onclick for close floor plan button
	dojo.connect(dojo.byId("chartTitleNode-close"), "onclick", function(evt) {
		setHash('','');
	});

	map.addLayer(basemap,0); //Add ESRI basemap at index 0 behind UW basemap
	map.addLayer(backgroundServiceLayer); //Add UW basemap

	//Create layer checkboxes
	dojo.style("layerList_container","display","inline"); //Show checkbox container on initial load
	new dijit.form.CheckBox({
		id: 'bse_chk',
		checked: true,
		onChange: function(isChecked) {
			updateLayerVisibility(0,isChecked);
		}
	}).placeAt("bse_chk_container", "first");
	new dijit.form.CheckBox({
		id: 'rms_chk',
		checked: true,
		onChange: function(isChecked) {
			updateLayerVisibility(1,isChecked);
		}
	}).placeAt("rms_chk_container", "first");
	new dijit.form.CheckBox({
		id: 'gsf_chk',
		checked: true,
		onChange: function(isChecked) {
			updateLayerVisibility(2,isChecked);
		}
	}).placeAt("gsf_chk_container", "first");

	//Set up classification menu
	//Get requested room attribute
  function classSelOnChange(newVal) {
  	//console.log(newVal);
  	getRoomAttribute([newVal],{"ANDS":{"FACNUM":facNum,"R.FLOOR_CODE":floor}},null);
	}
  var classMenu = new dijit.Menu({
		id: "classifyMenu",
		style: "display: none;"
  });
	var menuItem1 = new dijit.MenuItem({
		label: "None",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			//console.log('class none');
			currentRoomClassification["RETURN"] = null;
			currentRoomClassification["WHERE"] = null;
			roomsFeatureLayer.setRenderer(roomsFeaturesRenderer);
			if (currentRoomClassification.chartObjs.length > 0) { //Reset stroke of active bar chart items
  			dojo.forEach(currentRoomClassification.chartObjs, function(obj) {
  				if (obj.shape.fillStyle.toHex() == "#ffffff") { //This should check the chartObj attribute and set stroke color defined in classColors
  					obj.shape.setStroke({color:"#999"});
  				} else {
  					obj.shape.setStroke({color:"#FFF"});
  				}
  			});
  			currentRoomClassification.chartObjs = [];
  		}
			dojo.byId("legend").innerHTML = '';
			dojo.style("legend_container","display","none");
			roomsFeatureLayer.hide();
			roomsFeatureLayer.show();
		}
	});
	var menuItem2 = new dijit.MenuItem({
		label: "Subdivision",
		id: "classifyMenuItem-O.ORG_NAME",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('O.ORG_NAME');

		}
	});
	var menuItem3 = new dijit.MenuItem({
		label: "Department",
		id: "classifyMenuItem-OD.ORG_DEPT_NAME",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('OD.ORG_DEPT_NAME');

		}
	});
	var menuItem4 = new dijit.MenuItem({
		label: "College",
		id: "classifyMenuItem-OD.ORG_COLLEGE_NAME",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('OD.ORG_COLLEGE_NAME');
		}
	});
	var menuItem5 = new dijit.MenuItem({
		label: "Primary Use",
		id: "classifyMenuItem-RT.PRIMARY_USE",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('RT.PRIMARY_USE');
		}
	});
	var menuItem6 = new dijit.MenuItem({
		label: "Space Category",
		id: "classifyMenuItem-RT.SPACE_CATEGORY",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('RT.SPACE_CATEGORY');
		}
	});
	var menuItem7 = new dijit.MenuItem({
		label: "Occupancy",
		id: "classifyMenuItem-RV.Occupancy",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('RV.Occupancy');
		}
	});
	var menuItem8 = new dijit.MenuItem({
		label: "Last Confirmed",
		id: "classifyMenuItem-R.CONFIRM_DATE",
		//iconClass: "dijitEditorIcon dijitEditorIconSave",
		onClick: function() {
			classSelOnChange('R.CONFIRM_DATE');
		}
	});
	classMenu.addChild(menuItem1);
	classMenu.addChild(menuItem2);
	classMenu.addChild(menuItem3);
	classMenu.addChild(menuItem4);
	classMenu.addChild(menuItem5);
	classMenu.addChild(menuItem6);
	classMenu.addChild(menuItem7);
	classMenu.addChild(menuItem8);
	var classButton = new dijit.form.DropDownButton({
    label: "Classify",
    name: "classButton",
    dropDown: classMenu,
    id: "classButton"
  });
  dojo.byId("classification").appendChild(classButton.domNode);

	getAuthz(makeAuthzButton("userwelcome"), false); //Get ASTRA authorizations and set authz button and dialog content

	//Create empty gridRoom store
	gridRoom_storeEmpty = new dojo.data.ItemFileWriteStore({
		data : {
			items : []
		}
	});
	gridRoom_storeEmpty.storeKind = 'R';

	//Create empty gridRA store
	gridRA_storeEmpty = new dojo.data.ItemFileWriteStore({
		data : {
			items : []
		}
	});
	gridRA_storeEmpty.storeKind = 'RA';

	//Create empty gridBdgt store
	gridBdgt_storeEmpty = new dojo.data.ItemFileWriteStore({
		data : {
			items : []
		}
	});
	gridBdgt_storeEmpty.storeKind = 'RAB';

	//Create empty gridRAU store
	gridRAU_storeEmpty = new dojo.data.ItemFileWriteStore({
		data : {
			items : []
		}
	});
	gridRAU_storeEmpty.storeKind = 'RAU';

	//Create empty gridRAO store
	gridRAO_storeEmpty = new dojo.data.ItemFileWriteStore({
		data : {
			items : []
		}
	});
	gridRAO_storeEmpty.storeKind = 'RAO';

	qStore_org = new CustomQueryReadStore({url:'common/php/organizations.php', requestMethod:'get'}); //Create query store for organizations
	qStore_emp = new CustomQueryReadStore({url:'common/php/employees.php', requestMethod:'get'}); //Create query store for employees
	qStore_bdgt = new CustomQueryReadStore({url:'common/php/budgets.php', requestMethod:'get'}); //Create query store for budgets

	dojo.connect(map, "onLayerAddResult", function(layer, error) {
		//console.log(layer, error);
		if (layer.layerInfos && layer.layerInfos.length == 0) {
  		console.log('NO LAYER INFOS',layer.layerInfos);
  		//console.log(layer, error);
  	}
	});

	dojo.connect(map, "onLoad", mapOnLoad); //Run mapOnLoad() when map has loaded.
}

//When the map loads..
function mapOnLoad() {
	//Check URI hash for changes, time in ms
	hashInt = setInterval(setFacAndFloorToHash, 500);
	map.isPanning = false;

	//Configure bookmarks menu
	bookmarks = [{
			"name": "Current Facility",
			"extent": {
        "spatialReference": {
            "wkid": 3857
        },
        "xmin":-13616761.863110848,
        "ymin":6048279.3671294805,
        "xmax":-13613059.444553185,
        "ymax":6051007.213576479
			}
		},{
			"name": "UW Seattle",
      "extent": {
        "spatialReference": {
            "wkid": 3857
        },
        "xmin":-13616761.863110848,
        "ymin":6048279.3671294805,
        "xmax":-13613059.444553185,
        "ymax":6051007.213576479
      }
    },{
			"name": "UW Tacoma",
      "extent": {
        "spatialReference": {
          "wkid":3857
        },
        "xmin":-13630363.473995604,
        "ymin":5981712.8672859585,
        "xmax":-13629403.233827852,
        "ymax":5982557.257582725
      }
    },{
			"name": "UW Bothell",
      "extent": {
        "spatialReference": {
            "wkid": 3857
        },
        "xmin":-13603614.69424584,
        "ymin":6066191.906976639,
        "xmax":-13600901.179741645,
        "ymax":6068480.240510986
      }
    },{
			"name": "South Lake Union",
      "extent": {
        "spatialReference": {
            "wkid": 3857
        },
        "xmin":-13619154.700394839,
        "ymin":6044328.528229881,
        "xmax":-13618654.873889498,
        "ymax":6044669.509035794
      }
    },{
			"name": "Harborview",
      "extent": {
        "spatialReference": {
            "wkid": 3857
        },
        "xmin":-13617387.094115686,
        "ymin":6040971.94711966,
        "xmax":-13616461.489476372,
        "ymax":6041653.908731335
      }
		},{
			"name": "Friday Harbor",
      "extent": {
        "spatialReference": {
            "wkid": 3857
				},
				xmax:-13693077.596336335,
				xmin:-13694074.860689659,
				ymax:6198548.412894355,
				ymin:6197939.3053252585
			}
		},{
			"name": "Pack Forest",
      "extent": {
        "spatialReference": {
            "wkid": 3857
        },
				xmax:-13614652.538041707,
				xmin:-13616647.066748574,
				ymax:5917021.0314964745,
				ymin:5915802.816358147
			}
		},{
			"name": "Big Beef Creek",
      "extent": {
        "spatialReference": {
            "wkid": 3857
        },
				xmax:-13666132.246844277,
				xmin:-13670121.304258015,
				ymax:6050214.176079256,
				ymin:6047777.745802602
			}
    }];

	bookmark = new esri.dijit.Bookmarks({
    map: map,
    bookmarks: bookmarks,
    editable: false
  }, dojo.byId('bookmarks'));

	//Create scale bar
  scalebar = new esri.dijit.Scalebar({
    map:map,
    attachTo:"bottom-right"
  });

	esri.show(dojo.byId("northArrow")); //Show North Arrow

	measureToolConfig();

  dojo.connect(dijit.byId('mapDiv'), 'resize', map, map.resize); //Connect map div resize event to resizeMap function
	dijit.byId('chartPane').lastWidth = dijit.byId('chartPane').containerNode.clientWidth; //Save chartPane's width
	//Connect map div resize event to resize chart function
	dojo.connect(dijit.byId('chartPane'), 'resize', function() {
		if (this.lastWidth != this.containerNode.clientWidth) { //If width changed
			this.lastWidth = this.containerNode.clientWidth; //Save last width
			if (dojo.byId('chartNode').innerHTML != '') {
				floorChart.resize(); //Resize chart if chart exists
			}
		}
	});
	roomsGraphicsLayer = new esri.layers.GraphicsLayer({id:"gfxLayer_roomsHover"});	//create graphics layer for room hover
	roomInfoGraphicsLayer = new esri.layers.GraphicsLayer({id:"gfxLayer_roomsSelect"}); //create graphics layer for room select
	facsGraphicsLayer = new esri.layers.GraphicsLayer({id:"gfxLayer_facsQuery"}); //create graphics layer for facility select

	//Create query parameters for facility layer
	var facQuery = new esri.tasks.Query();
	facQuery.spatialRelationship = esri.tasks.Query.SPATIAL_REL_INTERSECTS;
	facQuery.outFields = ["BUILDINGID"];
	facQuery.returnGeometry = true;

	//Connect to map's onClick event and query facility layer for facility number at map click point
	dojo.connect(map, "onClick", function(evt) {
		facQuery.geometry = evt.mapPoint;
		facQueryTask.execute(facQuery);
	});

	//Process results of facQueryTask
	dojo.connect(facQueryTask, "onComplete", function(queryResult) {
		//console.log(queryResult);
		//Set new facNum to facNum of first feature in results (typically should be zero or one feature in results, but the possibility for multiple features at a single point exists)
		dojo.some(queryResult.features,function(feature) {
			var queryFacNum = feature.attributes.BUILDINGID;
			//If the facNum is not the current facNum and is not blank
			if (queryFacNum != facNum && queryFacNum != '') {
				facsGraphicsLayer.clear(); //Clear any facility selection graphics
				feature.setSymbol(facSelSymbol);
				facsGraphicsLayer.add(feature);		//Add geometry of query result to the viewer
  			setHash(queryFacNum,floor);			//Set facNum to query result
				return;
			}
		});
	});

	//Connect to rooms feature layer onMouseOver event
	dojo.connect(roomsFeatureLayer, "onMouseOver", function(evt) {
		if (!(map.isPanning)) {
  		roomsGraphicsLayer.clear();
  		//dojo.byId("info").innerHTML = 'Room: ' + evt.graphic.attributes['ROOMNUMBER'];
  		var selectedRoom = new esri.Graphic(evt.graphic.geometry, highlightSymbol, evt.graphic.attributes, evt.graphic.infoTemplate);
  		roomsGraphicsLayer.add(selectedRoom);
  		clearTimeout(roomHoverTimer_out);
  		roomHoverTimer_out = null;
  		var rendererAttr = roomsFeatureLayer.renderer.attributeField;
  		var roomAttrVal = '';
  		if (rendererAttr) {
  			var attrVal = evt.graphic.attributes[rendererAttr];
  			if ("undefined" !== typeof attrVal) {
  				var rendererAttrBase = rendererAttr.split('.',2)[1]; //Remove prefix from attr
  				if (classColors[rendererAttrBase] && classColors[rendererAttrBase][attrVal]) {
  					var classColor = dojo.blendColors(dojo.colorFromString(classColors[rendererAttrBase][attrVal].fill),new dojo.Color([255,255,255]),.5).toHex();
  					roomAttrVal = '<span class="roomAttrVal" style="background-color:' + classColor + '">' + attrVal + '</span>';
  				} else if (currentRoomClassification.classColors[rendererAttrBase] && typeof currentRoomClassification.classColors[rendererAttrBase][attrVal] !== 'undefined') {
  					var classColor = dojo.blendColors(currentRoomClassification.classColors[rendererAttrBase][attrVal].fill,new dojo.Color([255,255,255]),.5).toHex();
  					roomAttrVal = '<span class="roomAttrVal" style="background-color:' + classColor + '">' + attrVal + '</span>';
  				} else {
  					roomAttrVal = attrVal;
  				}
  			}
  		}
  		var roomNum = evt.graphic.attributes['ROOMNUMBER'];
  		//console.log(roomNum, attrVal);
  		dojo.byId("infoSummaryRoom").innerHTML = roomNum;
  		dojo.byId("infoSummaryAttr").innerHTML = roomAttrVal;
  		if (dojo.style("infoSummaryContainer","visibility") == 'hidden') {
    		roomHoverTimer_in = setTimeout(function() {
    			if (!roomHoverTimer_in) return;
    			roomHoverTimer_in = null;
    			clearTimeout(roomHoverTimer_out);
    			roomHoverTimer_out = null;
    			dojo.style("infoSummaryContainer","visibility","visible");
    		}, 250);
    	}
    }
	});

	//Connect to rooms feature layer onMouseOut event
	dojo.connect(roomsFeatureLayer, "onMouseOut", function(evt) {
		if (!(map.isPanning)) {
  		//dojo.byId("info").innerHTML = '&nbsp;';
  		roomsGraphicsLayer.clear();
  		clearTimeout(roomHoverTimer_in);
  		roomHoverTimer_in = null;
  		roomHoverTimer_out = setTimeout(function() {
  			if (!roomHoverTimer_out) return;
  			roomHoverTimer_out = null;
  			dojo.style("infoSummaryContainer","visibility","hidden");
    	},750);
    }
	});

	dojo.connect(roomsFeatureLayer, "onDblClick", function(evt) {
		dojo.stopEvent(evt);
	});

	//Connect to graphics layer onClick event
	dojo.connect(roomsFeatureLayer, "onClick", function(evt) {
		//console.log(evt);
		dojo.stopEvent(evt);
		roomInfoGraphicsLayer.clear();
		var clickedRoomNum = evt.graphic.attributes['ROOMNUMBER'];
		var clickPoint = evt.screenPoint;
		openRoomInfo(clickedRoomNum, clickPoint);
	});

	dojo.connect(map,"onPanEnd", function(extent, startPoint) {
		map.isPanning = false;
	});

	dojo.connect(map,"onPanStart", function(extent, startPoint) {
		map.isPanning = true;
	});

	dojo.connect(map,"onZoomEnd", function(extent, zoomFactor, anchor, level) {
		//Hide ESRI basemap past zoom level 19
		if (level > 19) {
			basemap.hide();
		} else {
			basemap.show();
		}
	});

	//Connect to mapInfoWindow onHide event, to destroy grids
	dojo.connect(map.infoWindow, "onHide", function(evt) {
		roomInfoGraphicsLayer.clear();
		dojo.empty("isCurrentButton_container"); //Destroy children in Is Current? button container
		if (gridRoom) {
			gridRoom.destroyRecursive(true);
			gridRoom=null;
		}
		if (gridRA) {
			gridRA.destroyRecursive(true);
			gridRA=null;
		}
		if (gridRAO) {
			gridRAO.destroyRecursive(true);
			gridRAO=null;
		}
		if (gridRAU) {
			gridRAU.destroyRecursive(true);
			gridRAU=null;
		}
		if (gridBdgt) {
			gridBdgt.destroyRecursive(true);
			gridBdgt=null;
		}
	});

	gridRoom_layout = [
		{
    	onAfterRow: function(rowIndex, subRows, rowNode) {
    		//console.log({'gridType': 'R', 'onAfter' : rowIndex, 'subRows' : subRows});
    	},
    	cells:
    	[
    		{
    			field : "ROOM_NUMBER",
    			name : "Room Number",
    			width : "7em"
    		},{
    			field : "SQUARE_FEET",
    			name : "Square Feet",
					formatter : formatterNumber
    		},{
    			field : "ROOM_TYPE",
    			name : "Primary Use",
    			width : "12em",
    			editable : true,
    			type : dojox.grid.cells.Select,
    			options : ["010 - PUBLIC RESTROOM","011 - CUSTODIAL SUPPLY CLOSET","012 - JANITOR ROOM","013 - TRASH ROOM","020 - PUBLIC CIRCULATION","030 - MECHANICAL AREA","031 - ELECTRICAL CLOSET","032 - TELECOMMUNICATIONS","040 - STRUCTURAL AREA","050 - UNASSIGNED AREA","060 - ALTER\/CONVERSION","070 - UNFINISHED AREA","090 - PARKING GARAGE","095 - PRKNG GARAGE SERVICE","110 - GENERAL CLASSROOM","111 - ASSIGNED CLASSROOM","112 - COMPUTER CLASSROOM","115 - CLASSROOM SERVICE","116 - BREAKOUT SPACE","140 - REMOTE CLASSROOM","210 - LAB CLASSROOM","211 - GENERAL CLASS LAB","212 - RESTRICTED CLASS LAB","215 - CLASS LAB SERVICE","220 - OPEN LABORATORY","225 - OPEN LAB SERVICE","230 - COMPUTER LABORATORY","235 - COMPUTER LAB SERVICE","250 - RESEARCH LAB","255 - RESEARCH LAB SERVICE","260 - BL3 WET LAB","261 - COMPUTATION DRY LAB","262 - BL2 WET LAB","264 - SPECIALIZED WET LAB","265 - ANIMAL SURGERY","311 - FACULTY OFFICE\/DESK","312 - DEAN\/CHAIR\/DIR\/OFF","313 - TA\/RA OFFICE\/DESK","314 - CLERICAL OFFICE\/DESK","315 - OFFICE GENERAL SUPT","316 - PROSTAFF OFFICE\/DESK","317 - OTHER SPACE\/DESK","318 - OFFICE STORAGE","319 - CONTRACT EMPLOYEE","325 - OFFICE PRIVATE RESTROOM","350 - CONFERENCE ROOM","355 - CONFERENCE SERVICE","360 - BREAKROOM\/KITCHEN","362 - OFFICE LIBRARY","363 - OFFICE EQUIP ROOM","364 - OFFICE SUPPLY STOR","410 - LIBRARY STUDY ROOM","412 - NON-LIBRARY STUDY RM","420 - LIBRARY COLLECTIONS","430 - OPEN-STACK STUDY RM","440 - PROCESSING ROOM","441 - USER ASSISTANCE","442 - TECHNICAL PROCESSING","455 - STUDY SERVICE","520 - ATHLETIC FACILITIES","523 - ATHLETIC SPCTR SEATS","525 - ATHLETIC FAC SERVICE","530 - MEDIA PRODUCTION","535 - MEDIA PRODUCTION SRV","540 - CLINIC","545 - CLINIC SERVICE","550 - DEMONSTRATION","555 - DEMONSTRATION SERV","560 - TEST\/DEMO FACILITY","570 - ANIMAL QUARTERS","575 - ANIMAL QUARTERS SERV","580 - GREENHOUSE","585 - GREENHOUSE SERVICE","590 - NOT CLASSIFIED","610 - ASSEMBLY","615 - ASSEMBLY SERVICE","620 - EXHIBITION","625 - EXHIBITION SERVICE","630 - FOOD FACILITIES","635 - FOOD FACILITIES SERV","636 - NUTRITION STATIONS","637 - FOOD PREPARATION ARE","638 - FOOD CLEANING AREAS\/","639 - SERVING LINE","640 - DAY CARE","645 - DAY CARE SERVICE","650 - PUBLIC LOUNGE","651 - DEPARTMENTAL LOUNGE","655 - PUBLIC LOUNGE SERV","660 - MERCHANDISING","661 - VENDING AREA","665 - MERCHANDISING SERV","670 - RECREATION","675 - RECREATION SERV","680 - MEETING ROOM","685 - MEETING","710 - CENTRAL COMPUTER","711 - DEPARTMENT COMPUTER","712 - CENTRAL SECURITY SYS","715 - CNTRL COMPUTER SER","716 - OFFICE COMPUTER SERV","717 - INFRASTRUCT DIST CTR","720 - SHOP","725 - SHOP SERVICE","730 - CENTRAL STORAGE","731 - FURNITURE\/EQUIPMENT ","735 - CENTRAL STORAGE SERV","740 - VEHICLE STORAGE","745 - VEHICLE STORAGE SERV","750 - CENTRAL SERVICE","755 - CENTRAL SERVICE SERV","760 - HAZARADOUS MATERIALS","765 - HAZMAT SERVICE","810 - PATIENT BEDROOM","815 - PATIENT BEDROOM SERVICE","820 - PATIENT BATH","830 - PATIENT STATION","835 - PATIENT STATION SERVICE","840 - SURGERY","845 - SURGERY SERVICE","850 - TREATMENT\/EXAMINATION CLINIC","855 - TREATMENT\/EXAM CLINIC SERVICE","860 - DIAGONSTIC SERVICE LAB","865 - DIAGONSTIC SERV LAB SUPPORT","870 - CENTRAL SUPPLIES","880 - PUBLIC WAITING","890 - STAFF ON-CALL FACILITY","895 - STAFF ON-CALL FACILITY SERVICE","910 - SLEEP\/STUDY\/WO\/RESTROOM","919 - RESTROOMS\/SHOWERS","920 - SLEEP\/STUDY\/W\/RESTROOM","935 - SLEEP\/STUDY SERVICE","950 - APARTMENT","955 - APARTMENT SERVICE","970 - HOUSE"],
    			values : ["010","011","012","013","020","030","031","032","040","050","060","070","090","095","110","111","112","115","116","140","210","211","212","215","220","225","230","235","250","255","260","261","262","264","265","311","312","313","314","315","316","317","318","319","325","350","355","360","362","363","364","410","412","420","430","440","441","442","455","520","523","525","530","535","540","545","550","555","560","570","575","580","585","590","610","615","620","625","630","635","636","637","638","639","640","645","650","651","655","660","661","665","670","675","680","685","710","711","712","715","716","717","720","725","730","731","735","740","745","750","755","760","765","810","815","820","830","835","840","845","850","855","860","865","870","880","890","895","910","919","920","935","950","955","970"],
    			formatter : function(val, rowIdx, cell) {
    				//console.log(cell);
    				if (val === null || val == '' || val == '590') {
    					cell.customClasses.push('nullErrorClass');
    				}
    				var valIdx = dojo.indexOf(cell.values, val);
    				if (cell.options[valIdx]) {
    					var valLabel = cell.options[valIdx];
    				}

          	var helpWidget = new CustomGridCellHelp({
          		label:valLabel,
          		helpClass:cell.field,
          		helpValue:val,
          		tooltip:helpTooltip
          	});

          	return (helpWidget ? helpWidget : valLabel);
    			}
    		},{
    			field : "ORGANIZATION",
    			name : "Organization",
    			width : "12em",
    			editable : true,
    			type : dojox.grid.cells._Widget,
    			widgetClass: CustomFilteringSelect,
    			widgetProps: {
            store:qStore_org,
            gridStoreType:'R',
            searchAttr:"DESCR",
            queryExpr:"*${0}*",
            autoComplete:true,
            //required: false,
            highlightMatch:"all",
            labelType:"text",
            searchDelay:500,
            onChange: function(newValue) {
      				//console.log(["onChange",newValue, this]);
      				var orgName = this.displayedValue.split(' - ')[1];
      				gridRoom_store.idNameVals = {
      					idVal:newValue,
      					nameVal:orgName,
      					attrVal:"ORG_NAME"
      				};
      				this.set('value',newValue);
      				gridRoom.edit.apply();
      				this.focusNode.blur(); //Lose focus on select to submit
							this.set('value','');
      			}
    			},
    			formatter : function(val, rowIdx, cell) {
    				//console.log([val,rowIdx,cell,this]);
    				if (val === null || val == '' || val.substr(0,7) == 'UNKNOWN') {
    					cell.customClasses.push('nullErrorClass');
    				}
    				var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME");
    				return (descVal ? val + ' - ' + descVal : val);
    			}
    		},{
    			field : "CAPACITY",
    			name : "Capacity",
    			width : "4.5em",
    			editable : true,
    			formatter : formatterNumber
    		}
    	]
    }
	];

	gridRA_layout = [

		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow roomChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				formatter : formatterEdit
			},{
				field : "ASSIGNEE_ORGANIZATION",
				name : "Assignment Organization",
				editable : true,
				width : "15em",
				type : dojox.grid.cells._Widget,
				widgetClass: CustomFilteringSelect,
				widgetProps: {
          store:qStore_org,
          gridStoreType:'RA',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				//console.log(["onChange",newValue, this]);
    				var orgName = this.displayedValue.split(' - ')[1];
    				gridRA_store.idNameVals = {
    					idVal:newValue,
    					nameVal:orgName,
    					attrVal:"ORG_NAME"
    				};
    				this.set('value',newValue);
      			gridRA.edit.apply();
    				this.focusNode.blur();//Lose focus on select to submit
						this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ORG_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "ASSIGNEE_EMPLOYEE_ID",
				name : "Principal Investigator",
				editable : true,
				width : "12em",
				type : dojox.grid.cells._Widget,
  			widgetClass: CustomFilteringSelect,
  			widgetProps: {
          store:qStore_emp,
          gridStoreType:'RA',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				//console.log(["onChange",newValue, this]);
    				var empName = this.displayedValue.split(' - ')[1];
    				gridRA_store.idNameVals = {
    					idVal:newValue,
    					nameVal:empName,
    					attrVal: "EMPLOYEE_NAME"
    				};
    				this.set('value',newValue);
      			gridRA.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_NAME");
					return (descVal ? (val == '999999999' ? val + ' - ' + descVal : val + ' - ' + "<a href=\"https://www.washington.edu/home/peopledir/?method=name&length=full&term=" + descVal + "\" title=\"UW Directory\" target=\"_blank\" class=\"gridPersonName\">" + descVal + '</a>') : val);
				}
			},{
				field : "ASSIGNEE_ROOM_PERCENT",
				name : "Room %",
				editable : true,
				width : "4em",
				formatter : formatPercent
			},{
				field : "DEPT_NOTE",
				name : "Notes",
				editable : true,
				width : "10em",
				type : dojox.grid.cells._Widget,
				widgetClass : dijit.form.SimpleTextarea,
				widgetProps : {
					maxLength : 256,
					onMouseUp : function(evt) {
						//console.log(this,pane);
						//Trigger row height change on widget mouse up event
						if (this.grid && this.gridRowIndex) {
							this.grid.rowHeightChanged(this.gridRowIndex);
						}
					}
				}
			}]
		}
	];

	gridBdgt_layout = [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAB', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow raChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				hidden : true,
				formatter : formatterEdit
			},{
				field : "BUDGET_NUMBER",
				name : "Budget Number",
				editable : true,
				type : dojox.grid.cells._Widget,
  			widgetClass: CustomFilteringSelect,
  			widgetProps: {
          store:qStore_bdgt,
          gridStoreType:'BDGT',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				console.log(["onChange",newValue, this]);
    				var bdgtName = this.displayedValue.split(' - ')[1];
    				gridBdgt_store.idNameVals = {
    					idVal:newValue,
    					nameVal:bdgtName,
    					attrVal: "BUDGET_NAME"
    				};
    				this.set('value',newValue);
      			gridBdgt.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "BUDGET_NAME");
					return (descVal ? val + ' - ' + descVal : val);
				}
			},{
				field : "PRIMARY_ROOM",
				name : "Primary Room",
				width : "4em",
				editable : true,
				type: CustomGridCellBool
			}]
		}
	];

	gridRAO_layout = [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAO', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow raChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				hidden : true,
				formatter : formatterEdit
			},{
				field : "OCCUPANT_EID",
				name : "EID",
				editable : true,
				width : "15em",
				type : dojox.grid.cells._Widget,
  			widgetClass: CustomFilteringSelect,
  			widgetProps: {
          store:qStore_emp,
          gridStoreType:'RAO',
          searchAttr:"DESCR",
          queryExpr:"*${0}*",
          autoComplete:true,
          highlightMatch:"all",
          labelType:"text",
          searchDelay:500,
          onChange: function(newValue) {
    				console.log(["onChange",newValue, this]);
    				var empName = this.displayedValue.split(' - ')[1];
    				gridRAO_store.idNameVals = {
    					idVal:newValue,
    					nameVal:empName,
    					attrVal: "EMPLOYEE_NAME"
    				};
    				this.set('value',newValue);
      			gridRAO.edit.apply();
    				this.focusNode.blur(); //Lose focus on select to submit
						this.set('value','');
    			}
  			},
				formatter : function(val, rowIdx, cell) {
  				//console.log([val,rowIdx,cell,this]);
					if (val === null || val == '') {
						cell.customClasses.push('nullErrorClass');
					}
					var descVal = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "EMPLOYEE_NAME");
					return (descVal ? val + ' - ' + "<a href=\"https://www.washington.edu/home/peopledir/?method=name&length=full&term=" + descVal + "\" title=\"UW Directory\" target=\"_blank\" class=\"gridPersonName\">" + descVal + '</a>': val);
				}
			}]
		}
	];

	gridRAU_layout = [
		{
			onAfterRow: function(rowIndex, subRows, rowNode) {
				//console.log({'gridType': 'RAU', 'onAfter' : rowIndex, 'subRows' : subRows});
				dojo.parser.parse(rowNode);
			},
			cells:[
			{
				field : "EDIT",
				name : '<div dojoType="dijit.form.Button" title="Add new record" showLabel="true" class="editButton addRow raChild" onClick="addRow(-1,this.domNode.parentNode.parentNode.id)">+</div>',
				editable : false,
				width : "28px",
				hidden : true,
				formatter : formatterEdit
			},{
				field : "FUNCTIONAL_USE_CODE",
				name : "Use Type",
				editable : true,
				type : dojox.grid.cells.Select,
				options : ["GA - General Administration","INST - Instruction","LIB - Libraries","O&M - Operations and Maintenance","OIA - Other Institutional Activities","PC - Patient Care","RSCH - Organized Research","SPA - Sponsored Project Admin.","APL - Applied Physics Lab","OSA - Other Sponsored Activities","RPC - Regional Primate Center","VAC - Vacant","CA - College Administration","DA - Department Administration","SSA - Student Services Admin","UNAS - Unassigned","JT - Joint Use","CRC - Cost or Recharge Center","DR - Departmental Research","SLU - South Lake Union","VESL - Research Vessel Support","NOvalue - NO value available"],
				values : ["GA","INST","LIB","O&M","OIA","PC","RSCH","SPA","APL","OSA","RPC","VAC","CA","DA","SSA","UNAS","JT","CRC","IDR","SLU","VESL","NOvalue"],
				formatter : function(val, rowIdx, cell) {
					var valIdx = dojo.indexOf(cell.values, val.replace(/&amp;/g, "&"));  //Search for value in value list.  Decode any ampersands.
					if (cell.options[valIdx]) {
						var valLabel = cell.options[valIdx];

          	var helpWidget = new CustomGridCellHelp({
          		label:valLabel,
          		helpClass:cell.field,
          		helpValue:val,
          		tooltip:helpTooltip
          	});
        		return (helpWidget ? helpWidget : valLabel);
        	} else {
        		return val;
        	}
				}
			},{
				field : "FUNCTIONAL_USE_PERCENT",
				name : "Use %",
				editable : true,
				width : "3.5em",
				formatter : formatPercent
			}]
		}
	];
}

function updateLayerVisibility(layerIdx, isVisible) {
	//Get current visible layers
	var visible = roomsServiceLayer.visibleLayers;
	//If -1 (no layers visible) exists in array, start with empty array
	if (dojo.indexOf(visible,-1) > -1) {
		visible = [];
	}

	//If layer is visible and is not in array, add to array
	if (isVisible && dojo.indexOf(visible,layerIdx) == -1) {
		 visible.push(layerIdx);
	} else if (!(isVisible) && dojo.indexOf(visible,layerIdx) > -1) { //If layer is not visible and is in array, remove from array
		var itmIdx = dojo.indexOf(visible,layerIdx)
		visible.splice(itmIdx, 1);
	}

	//If the array is empty, add -1 (no layers visible)
	if(visible.length === 0){
  	visible.push(-1);
	}

	//Set visible layers
	roomsServiceLayer.setVisibleLayers(visible);
}

var extentFacNum = '';
//Set layer definitions, rebuild graphics layer.  If new facNum get floors and set extent.
function setLayerDefs(ags_layer, new_facnum, new_floor, new_room) {
	var old_facnum = facNum;
	var old_floor = floor;
	facNum = new_facnum;
	floor = new_floor;

	var layerDefinitions = [];
	layerDefinitions[0] = "BUILDINGID = '" + new_facnum + "' AND FLOORCODE = '" + new_floor + "'";
	layerDefinitions[1] = "BUILDINGID = '" + new_facnum + "' AND FLOORCODE = '" + new_floor + "'";
	layerDefinitions[2] = "BUILDINGID = '" + new_facnum + "' AND FLOORCODE = '" + new_floor + "'";
	ags_layer.setLayerDefinitions(layerDefinitions);

	if (old_facnum != new_facnum) {
		if (typeof new_facnum === 'undefined') {
			var emptyArray = [];
			setFloorSelect(emptyArray);
		} else {
  		//Set Floor Select element when new facNum is set
  		var setFloorSelDeferred = submitQuery_get({"FACNUM":facNum},"mapviewer/php/listfloors.php");
  		setFloorSelDeferred.addCallback(function(data) {
  			setFloorSelect(data.results);
  		});
  	}
	}

	//Hide the infoWindow
	if (map.infoWindow) {
		map.infoWindow.hide();
	}

	//Compare current facNum to facNum of features to whose extent was last set. If different, set extent to new facNum features
	if (extentFacNum != new_facnum) {
		//Create dojo.connect to set extent
		var onSetExtentConn = dojo.connect(roomsFeatureLayer, "onUpdateEnd", function() {
			dojo.disconnect(onSetExtentConn);
			//Zoom to extent of returned features
			if (roomsFeatureLayer.graphics.length > 0) {
				if (new_room) {
					var extent = getRoomExtent(new_room);
				} else {
    			var extent = esri.graphicsExtent(roomsFeatureLayer.graphics);
    		}
  			if (extent) {
  				map.setExtent(extent, true); //set query extent as new map extent
  				extentFacNum = facNum;
  			}
  		}
		});
	} else if (new_room) {
		if (old_floor === new_floor) {
  		var extent = getRoomExtent(new_room);
  		if (extent) {
    		map.setExtent(extent, true); //set query extent as new map extent
    	}
    	return;
    } else {
    	var onSetExtentConn = dojo.connect(roomsFeatureLayer, "onUpdateEnd", function() {
				dojo.disconnect(onSetExtentConn);
				var extent = getRoomExtent(new_room);
    		if (extent) {
      		map.setExtent(extent, true); //set query extent as new map extent
      	}
     	});
    }
	}

	//Set definition query for roomsFeatureLayer
	roomsFeatureLayer.setRenderer(roomsFeaturesRenderer);
	roomsFeatureLayer.setDefinitionExpression("BUILDINGID = '" + new_facnum + "' AND FLOORCODE = '" + new_floor + "'");

	//Set Facility value
	if(dijit.byId('facSelect')) {
		var theFacSel = dijit.byId('facSelect');
		theFacSel.attr('value',facNum);
		setNewFacDesc();
	}
	//Set Floor value
	if(dijit.byId('floorSelect')) {
		var theFloorSel = dijit.byId('floorSelect');
		theFloorSel.attr('value',floor);
		setNewFloorDesc();
	}

	//Delete/create new floor info chart
	if(dojo.byId('chartNode').innerHTML != '') {
		dojo.byId("chartTitleNode-type").innerHTML = '';
		floorChart.destroy();
	}

	if ((new_facnum != '') && (new_floor != '')) {
  	var setFloorSummaryDeferred = submitQuery(dojo.toJson({"FACNUM":new_facnum,"FLOOR":new_floor}),"mapviewer/php/summaryFloorOrgDeptCategory.php");
  	setFloorSummaryDeferred.addCallback(function(data) {
  		if (data['DEPT_SQFT'].length != 0 && data['SPACE_CATEGORIES'].length != 0) {
  			dojo.byId("chartTitleNode-type").innerHTML = 'Square Footage of Departments by Space Category';
      	floorChart = generateChart(data, "chartNode");
      	floorChart.deptCodes = data['DEPT_CODES']; //Store dept org codes for onclick function
    		floorChart.render();
    		//Connect to chart bars onclick event
    		floorChart.connectToPlot("default",function(evt) {
          // Process onclick event
          if(evt.type == "onclick") {
          	var category = evt.run.name;
          	var group = evt.chart.axes.y.labels[evt.index].text;
          	var groupCode = floorChart.deptCodes[group]; //Get dept org code
          	//console.log(evt, group, category);
          	getRoomAttribute(["RT.SPACE_CATEGORY","R.ORG7"],{"ANDS":{"FACNUM":facNum,"R.FLOOR_CODE":floor},"ORS":[{"RT.SPACE_CATEGORY":category,"R.ORG7":groupCode}]},evt);
          }
    		});
    		//Connect to org labels onclick event
    		floorChart.axes.y.group.connect('onclick',function(e) {
    			if (e.explicitOriginalTarget && e.explicitOriginalTarget.nodeName == '#text') {
    				//console.log(e, e.explicitOriginalTarget.wholeText, floorChart.deptCodes[e.explicitOriginalTarget.wholeText]);
    				var deptCode = floorChart.deptCodes[e.explicitOriginalTarget.wholeText]; //Get dept org code
    				getRoomAttribute(["RT.SPACE_CATEGORY","R.ORG7"],{"ANDS":{"FACNUM":facNum,"R.FLOOR_CODE":floor},"ORS":[{"R.ORG7":deptCode}]},null);
    			}
    		});
    	}
  	});
	}

	if (facNum != '' && floor != '') {
  	//Create a new list item in the history list for the new floor
  	dojo.create("li", {
  		innerHTML: getCurrentFacDesc() ? getCurrentFacDesc() : 'Facnum ' + facNum  + ', Floor ' + floor,
  		"class": "historyFloor",
  		"li-facNum": facNum,  //TO-DO: Change to fac code, the descriptive identifier
  		"li-floor": floor,
  		onclick: function() {
  			//console.log([dojo.attr(this,"li-facNum"),dojo.attr(this,"li-floor")]);
  			setHash(dojo.attr(this,"li-facNum"), dojo.attr(this,"li-floor"));
  		}
  	},dojo.byId('historyList'),"first");
  } else {
		document.title = 'GeoSIMS Map Viewer';
	}
}

function getRoomExtent(roomNum) {
	//console.log(roomsFeatureLayer.graphics);
	var roomExtent = false;
	if (dojo.some(roomsFeatureLayer.graphics, function(room) {
		if (room.attributes['ROOMNUMBER'] == roomNum) {
			roomExtent = room._extent.expand(1.5); //Get extent and expand extent 50%
			return true;
		}
	})) {
		return roomExtent; //Room num found in graphics layer
	} else {
		return false; //Room num not found in graphics layer
	}
}

function measureToolConfig() {

	//Configure measurement tool
  //dojo.keys.copyKey maps to CTRL on windows and Cmd on Mac.
  var snapManager = map.enableSnapping({snapKey:dojo.keys.copyKey});
  var layerInfos = [{layer: roomsFeatureLayer}];
  snapManager.setLayerInfos(layerInfos);

  var measurement = new esri.dijit.Measurement({
    map: map,
		defaultAreaUnit: esri.Units.SQUARE_FEET,
		defaultLengthUnit: esri.Units.FEET
  }, "measurementDiv");

  /**dojo.connect(measurement, "onMeasureEnd", function(activeTool){
    this.setTool(activeTool, false);
  });**/

  measurement.startup();
	esri.show(dojo.byId("measurementDiv-snaphelp"));
}

//Opens the pop-up infoWindow for a room number at a given coordinate point
function openRoomInfo(clickedRoomNum, clickPoint) {

	//Find graphic in map.graphics with roomNum, apply graphicSymbol and add to roomInfoGraphicsLayer
	function highlightRoomByRmno(roomNum, graphicSymbol) {
		roomInfoGraphicsLayer.clear();
		dojo.some(roomsFeatureLayer.graphics,function(graphic){
			if (graphic.attributes["ROOMNUMBER"] === roomNum) {
				var clickedRoomGfx = new esri.Graphic(graphic.geometry, graphicSymbol, graphic.attributes, graphic.infoTemplate);
				roomInfoGraphicsLayer.add(clickedRoomGfx);
				return true;
			}
		});
	}
	highlightRoomByRmno(clickedRoomNum, roomInfoSymbol);

	var clickPoint_mapGeom = esri.geometry.toMapGeometry(map.extent, map.width, map.height, clickPoint); //Capture the click point

	//Add clicked room to history list
	var historyListFirstChild = dojo.byId('historyList').firstChild;
	if (historyListFirstChild.nodeName == 'LI') {
		historyListFirstChild = dojo.create("ul", {"class":"historyNestedList"},dojo.byId('historyList'),"first");
	}
	dojo.create("li", {
			innerHTML: clickedRoomNum,
			"class": "historyRoom",
			"li-facNum": facNum,
			"li-floor": floor,
			"li-room": clickedRoomNum,
			"li-coords" : clickPoint_mapGeom.x + ',' + clickPoint_mapGeom.y,
			onclick: function() {
				//console.log([dojo.attr(this,"li-facNum"),dojo.attr(this,"li-floor"),dojo.attr(this,"li-room")]);
				if (dojo.attr(this,"li-facNum") == facNum && dojo.attr(this,"li-floor") == floor) {
					var pointCoords = dojo.attr(this,"li-coords").split(',');
					var newPoint = new esri.geometry.Point([pointCoords[0],pointCoords[1]],map.spatialReference);
					if (!(map.extent.contains(newPoint))) {
						map.centerAt(newPoint);
					}
					var newPoint_screenGeom = esri.geometry.toScreenGeometry(map.extent, map.width, map.height, newPoint);
					openRoomInfo(dojo.attr(this,"li-room"),newPoint_screenGeom);
				}
			}
		},
		historyListFirstChild,
		"first");

	//Set Room Info Window Title
	var infoTitle = clickedRoomNum + ' -- ' + facDesc;
	if (infoTitle.length > 62) {
		infoTitle = infoTitle.substr(0,62) + '...';
	}
	map.infoWindow.setTitle(infoTitle + '<span id="isCurrentButton_container" style="margin-left:10px;color:black;"></span>');
	map.infoWindow.show(clickPoint, map.getInfoWindowAnchor(clickPoint)); //Show infoWindow at click point
	if (!gridRoom) { //If infoWindow is closed, build grids and set datastores to empty
		//ROOM GRID
		gridRoom = addGrid({
			//store : gridRoom_storeEmpty,
			structure : gridRoom_layout,
			autoHeight : true,
			autoWidth : true,
			selectable : false,
			selectionMode : "none",
			loadingMessage : 'Loading..',
			noDataMessage : 'Loading..'
		}, "gridDiv_room");
		gridRoom.canSort = function(col){return false;}; //Disable grid sorting for the Room Info grid
		gridRoom.canEdit = function(inCell, inRowIndex) {
			//console.log(this._canEdit, inCell, inRowIndex);
			if (this._canEdit == true) {
				var editItem = this.getItem(inRowIndex);
				var editItem_org = this.store.getValue(editItem, "ORGANIZATION");
				if (checkAuthz(authz, facNum, editItem_org)) {
					return true;
				} else {
					postClientMessage({
						text:"Not authorized.",
						type:"failure"
					});
				}
			}
			return false;
		}
		gridRoom.onStartEdit = function(inCell, inRowIndex) {
			if (helpTooltip) helpTooltip.close();
		}
		gridRoom.startup();
		//ROOM ASSIGNMENT GRID
		gridRA = addGrid({
			//store : gridRA_storeEmpty,
			structure : gridRA_layout,
			autoHeight : true,
			autoWidth : true,
			selectionMode : "single",
			loadingMessage : 'Loading..',
			noDataMessage : 'Loading..'
		}, "gridDiv_asgnmnt");
		gridRA.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
		gridRA.canEdit = checkChildAuthz;
		gridRA.onStartEdit = function(inCell, inRowIndex) {
			if (helpTooltip) helpTooltip.close();
		}
		gridRA.startup();
		//Connect to RA grid's onSelected event and get selected RA's children
		dojo.connect(gridRA,"onSelected",function(rowIdx){
			//console.log(rowIdx, this);
			if (rowIdx >= 0) {
				gridRA.oldSelectionIdx = rowIdx;
  			var thisGrid = this;
  			var selItem = this.getItem(rowIdx);
  			var raFac = thisGrid.store.getValue(selItem, "FACILITY_CODE");
  			var raRm = thisGrid.store.getValue(selItem, "ROOM_NUMBER");
  			var raOrg = thisGrid.store.getValue(selItem, "ASSIGNEE_ORGANIZATION");
  			var raEmp = thisGrid.store.getValue(selItem, "ASSIGNEE_EMPLOYEE_ID");
				var raPer = thisGrid.store.getValue(selItem, "ASSIGNEE_ROOM_PERCENT");

  			//console.log(dojo.indexOf([raFac,raRm,raOrg,raEmp],""));
  			if (dojo.indexOf([raFac,raRm,raOrg,raEmp],"") == -1  && raPer != 0) { //Check if any RA identifiers are empty (new, unsubmitted room assignment)
    			//Set store messages
  				gridRAO.noDataMessage = 'Loading..';
    			gridRAU.noDataMessage = 'Loading..';
      		gridBdgt.noDataMessage = 'Loading..';
  				//Clear RA subgrid datastores
  				gridRAO.setStore(gridRAO_storeEmpty); //ROOM ASSIGNMENT OCCUPANT GRID
      		gridRAU.setStore(gridRAU_storeEmpty); //ROOM ASSIGNMENT USE GRID
      		gridBdgt.setStore(gridBdgt_storeEmpty); //BUDGET GRID

    			//Submit request for Room Assignment infos
    			var getRaInfoDeferred = submitQuery(dojo.toJson({"FACILITY_CODE":raFac,"ROOM_NUMBER":raRm,"ORGANIZATION":raOrg,"EMPLOYEE_ID":raEmp}),"mapviewer/php/listroomasgnmntinfo.php");
    			getRaInfoDeferred.addCallback(function(data) { //callback for RA info query
    				if (data.msg) {
          		postClientMessage({
          			text:data.msg.text,
          			type:data.msg.type
          		});
          		if (data.msg.type == 'failure') {
          			return;
          		}
          	}
        		//Room Assignment Occupant
        		if (gridRAO) {
            	gridRAO_store = new dojo.data.ItemFileWriteStore({
            		data: {
            			items: data.results.occupant
            		}
            	});
            	gridRAO_store.onSetListener = dojo.connect(gridRAO_store, "onSet", onSetFunction);
            	gridRAO_store.onDeleteListener = dojo.connect(gridRAO_store, "onDelete", onDeleteFunction);
            	gridRAO_store.onNewListener = dojo.connect(gridRAO_store, "onNew", onNewFunction);
            	gridRAO_store.storeKind = 'RAO'; //Add custom property storeKind
            	gridRAO_store.storeGrid = gridRAO; //Add custom property storeGrid
            	gridRAO_store.raId = data.request; //Room Assignment Identifiers
            	gridRAO_store.raId["FACILITY_NUMBER"] = facNum;
            	gridRAO.noDataMessage = 'None';
            	gridRAO.selection.clear();
            	gridRAO.setStore(gridRAO_store);
            }
          	//Room Assignment Use
          	if (gridRAU) {
            	gridRAU_store = new dojo.data.ItemFileWriteStore({
            		data: {
            			items: data.results.use
            		}
            	});
            	gridRAU_store.onSetListener = dojo.connect(gridRAU_store, "onSet", onSetFunction);
            	gridRAU_store.onDeleteListener = dojo.connect(gridRAU_store, "onDelete", onDeleteFunction);
            	gridRAU_store.onNewListener = dojo.connect(gridRAU_store, "onNew", onNewFunction);
            	gridRAU_store.storeKind = 'RAU';
            	gridRAU_store.storeGrid = gridRAU; //Add custom property storeGrid
            	gridRAU_store.raId = data.request; //Room Assignment Identifiers
            	gridRAU_store.raId["FACILITY_NUMBER"] = facNum;
            	gridRAU.noDataMessage = 'None';
            	gridRAU.selection.clear();
            	gridRAU.setStore(gridRAU_store);
          	}
          	//Room Assignment Budget
          	if (gridBdgt) {
            	gridBdgt_store = new dojo.data.ItemFileWriteStore({
            		data: {
            			items: data.results.budget
            		}
            	});
            	gridBdgt_store.onSetListener = dojo.connect(gridBdgt_store, "onSet", onSetFunction);
            	gridBdgt_store.onDeleteListener = dojo.connect(gridBdgt_store, "onDelete", onDeleteFunction);
            	gridBdgt_store.onNewListener = dojo.connect(gridBdgt_store, "onNew", onNewFunction);
            	gridBdgt_store.storeKind = 'RAB';
            	gridBdgt_store.storeGrid = gridBdgt; //Add custom property storeGrid
            	gridBdgt_store.raId = data.request; //Room Assignment Identifiers
            	gridBdgt_store.raId["FACILITY_NUMBER"] = facNum;
            	gridBdgt.noDataMessage = 'None';
            	gridBdgt.selection.clear();
            	gridBdgt.setStore(gridBdgt_store);
            }
            var roomOrg = gridRoom.store.getValue(gridRoom.getItem(0), "ORGANIZATION");
            if (checkAuthz(authz, facNum, roomOrg, raOrg)) {
            	dojo.forEach([gridRAO,gridRAU,gridBdgt], function(grid) {
            		grid.layout.setColumnVisibility(0,true);
            	});
            } else {
            	dojo.forEach([gridRAO,gridRAU,gridBdgt], function(grid) {
            		grid.layout.setColumnVisibility(0,false);
            	});
            }
        	});
        } else {
          //Set store messages
    			gridRAO.noDataMessage = ' ';
      		gridRAU.noDataMessage = ' ';
        	gridBdgt.noDataMessage = ' ';

    			//Clear RA subgrid datastores
    			gridRAO.setStore(gridRAO_storeEmpty); //ROOM ASSIGNMENT OCCUPANT GRID
        	gridRAU.setStore(gridRAU_storeEmpty); //ROOM ASSIGNMENT USE GRID
        	gridBdgt.setStore(gridBdgt_storeEmpty); //BUDGET GRID

        	//Hide add/delete column on child tables
        	dojo.forEach([gridRAO,gridRAU,gridBdgt], function(grid) {
            grid.layout.setColumnVisibility(0,false);
          });
        }
      } else { //no row is selected
      	//gridRA.selection.addToSelection(0);
      }
		});
		//ROOM ASSIGNMENT OCCUPANT GRID
		gridRAO = addGrid({
			store : gridRAO_storeEmpty,
			structure : gridRAO_layout,
			autoHeight : true,
			autoWidth : true,
			selectable : false,
			selectionMode : "single",
			loadingMessage : 'Loading data..',
			noDataMessage : 'No data.'
		}, "gridDiv_rao");
		gridRAO.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
		gridRAO.canEdit = checkChildAuthz;
		gridRAO.onStartEdit = function(inCell, inRowIndex) {
			if (helpTooltip) helpTooltip.close();
		}
		gridRAO.startup();
		//ROOM ASSIGNMENT USE GRID
		gridRAU = addGrid({
			store : gridRAU_storeEmpty,
			structure : gridRAU_layout,
			autoHeight : true,
			autoWidth : true,
			selectable : false,
			selectionMode : "single",
			loadingMessage : 'Loading data..',
			noDataMessage : 'No data.'
		}, "gridDiv_rau");
		gridRAU.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
		gridRAU.canEdit = checkChildAuthz;
		gridRAU.onStartEdit = function(inCell, inRowIndex) {
			if (helpTooltip) helpTooltip.close();
		}
		gridRAU.startup();
		//BUDGET GRID
		gridBdgt = addGrid({
			store : gridBdgt_storeEmpty,
			structure : gridBdgt_layout,
			autoHeight : true,
			autoWidth : true,
			selectable : false,
			selectionMode : "single",
			loadingMessage : 'Loading data..',
			noDataMessage : 'No data.'
		}, "gridDiv_bdgt");
		gridBdgt.canSort = function(col){ if(Math.abs(col) == 1) { return false; } else { return true; } }; //Disable sorting for 1st column (edit button column)
		gridBdgt.canEdit = checkChildAuthz;
		gridBdgt.onStartEdit = function(inCell, inRowIndex) {
			if (helpTooltip) helpTooltip.close();

			if (inCell.declaredClass == "dojox.grid.cells._Widget" && inCell.widgetProps.store) {
				inCell.widgetProps.store.RA_field = inCell.field;
				inCell.widgetProps.store.RA_grid = inCell.grid;
				inCell.widgetProps.store.RA_item = inCell.widgetProps.store.RA_grid.getItem(inRowIndex);
			}
		}
		gridBdgt.startup();
	} else { //If infoWindow is open, set grid stores to empty
  	dojo.forEach([gridRAO,gridRAU,gridBdgt], function(grid) {
  		grid.layout.setColumnVisibility(0,false);
  	});
		dojo.empty("isCurrentButton_container"); //Destroy children in Is Current? button container
		gridRoom.setStore(gridRoom_storeEmpty);//ROOM GRID
		gridRA.setStore(gridRA_storeEmpty); //ROOM ASSIGNMENT GRID
		gridRAO.setStore(gridRAO_storeEmpty); //ROOM ASSIGNMENT OCCUPANT GRID
		gridRAU.setStore(gridRAU_storeEmpty); //ROOM ASSIGNMENT USE GRID
		gridBdgt.setStore(gridBdgt_storeEmpty); //BUDGET GRID
	}
	//get room info: room, roomAssignment, roomAssignmentUse, budget
	var getRoomInfoDeferred = submitQuery(dojo.toJson({"FACNUM":facNum,"ROOM_NUMBER":clickedRoomNum}),"mapviewer/php/listroominfo.php");
	getRoomInfoDeferred.addCallback(function(data) { //update client-side data stores
		setRoomInfoStores(data);
	});
}

//Set data for grids
function setRoomInfoStores(data) {
	if (data.msg) {
		postClientMessage({
			text:data.msg.text,
			type:data.msg.type
		});
		if (data.msg.type == 'failure') {
			return;
		}
	}
	//Room grid
	gridRoom_store = new dojo.data.ItemFileWriteStore({
		data: {
			items: data.results.room
		}
	});
	gridRoom_store.onSetListener = dojo.connect(gridRoom_store, "onSet", null, onSetFunction);
	gridRoom_store.storeKind = 'R';
	gridRoom_store.storeGrid = gridRoom; //Add custom property storeGrid
	gridRoom.setStore(gridRoom_store);
	gridRoom_store.fetchItemByIdentity({
		identity: 0,
		onItem: function(item) {
			//console.log(item);
			if (item) {
  			var confirmDate = gridRoom_store.getValue(item, "CONFIRM_DATE");
  			var confirmUser = gridRoom_store.getValue(item, "CONFIRM_USER");
  					if (confirmDate === null) {
  						var confirmDate = 'Unconfirmed';
  						//var dialogContent = 'Confirmed correct: <span class="fontBold">' + confirmDate + '</span>';
  						var dialogContent = dojo.create("div",{innerHTML:'Confirmed correct: <span class="confirmDate fontBold">' + confirmDate + '</span><span class="confirmUserContainer" style="display:none"> by <span class="confirmUser fontBold">' + confirmUser + '</span></span>'},null);
  					} else {
    					//var dialogContent = 'Confirmed correct: <span class="fontBold">' + confirmDate + '</span> by <span class="fontBold">' + confirmUser + '</span>';
    					var dialogContent = dojo.create("div",{innerHTML:'Confirmed correct: <span class="confirmDate fontBold">' + confirmDate + '</span><span class="confirmUserContainer"> by <span class="confirmUser fontBold">' + confirmUser + '</span></span>'},null);
    				}

      			var confirmButtonContainer = dojo.create("div",{},null);
      			dojo.place(confirmButtonContainer,dialogContent,"last");
      			//var confirmContainer = dojo.create("div",{innerHTML: '<span class="confirmDate">' + confirmDate + '</span><span class="confirmUserContainer"' + (confirmUser ? '>': 'style="display:none">') + ', by <span class="confirmUser">' + confirmUser + '</span></span>',"class":"confirmText"},null);

            var currButtonDialog = new dijit.TooltipDialog({
          		content: dialogContent
      			});
    				var currButton = new dijit.form.DropDownButton({
              label: confirmDate,
              'class': "confirmButton",
              title: "Last confirmed correct",
              dropDown: currButtonDialog
          	});

          	var confirmButton = new dijit.form.Button({
            	label: "Confirm",
            	"class":"queryButton",
            	onClick: function() {
            		//console.log('click', this, cell);
            		currButton.closeDropDown();
            		//var thisRoomFacCode = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "FACILITY_CODE")
      					//var thisRoomRoomNum = cell.grid.store.getValue(cell.grid.getItem(rowIdx), "ROOM_NUMBER")
      					var thisRoomFacCode = gridRoom_store.getValue(item, "FACILITY_CODE");
  							var thisRoomRoomNum = gridRoom_store.getValue(item, "ROOM_NUMBER");

      					var recordID = [{'FACILITY_CODE':thisRoomFacCode,'ROOM_NUMBER':thisRoomRoomNum}];
      					var onCurrentDeferred = submitQuery(dojo.toJson(recordID),"common/php/updateroomconfirm.php");
      					onCurrentDeferred.addCallback(function(data) {

        					if (data.rowsUpdated === 0) {
                		postClientMessage({
        							text:"Not updated.",
        							type:"failure"
        						});
                		return;
                	}

                	postClientMessage({
                		text:"Updated.",
                		type:"success"
                	});

                	//Set new confirm date and user values in data store
                	dojo.disconnect(gridRoom_store.onSetListener);
        					gridRoom_store.setValue(item, 'CONFIRM_DATE', data.value['CONFIRM_DATE']);
        					gridRoom_store.setValue(item, 'CONFIRM_USER', data.value['CONFIRM_USER']);
        					gridRoom_store.save();
        					gridRoom_store.onSetListener = dojo.connect(gridRoom_store, "onSet", onSetFunction);

        					//Update date and user values in html
      						currButton.set('label',data.value['CONFIRM_DATE']);
      						//dojo.forEach([dialogContent,confirmContainer],function(container) {
        						dojo.query(".confirmDate",dialogContent).forEach(function(node, index, arr){
        							node.innerHTML = data.value['CONFIRM_DATE'];
        						});
        						dojo.query(".confirmUser",dialogContent).forEach(function(node, index, arr){
        							node.innerHTML = data.value['CONFIRM_USER'];
        						});
        						dojo.query(".confirmUserContainer",dialogContent).forEach(function(node, index, arr){
        							dojo.style(node,"display","");
        						});
        					//});
      					});
      					onCurrentDeferred.addErrback(function(data) {
      						postClientMessage({
      							text:"Not updated.",
      							type:"failure"
      						});
      					});
            	}
            }).placeAt(confirmButtonContainer);
      			var cancelConfirmButton = new dijit.form.Button({
            	label: "Close",
            	"class":"queryButton",
            	onClick: function() {
            		currButton.closeDropDown();
            	}
            }).placeAt(confirmButtonContainer);

          	//dojo.place(confirmContainer,currButton.domNode,"last");

  			//dojo.byId("isCurrentButton_container").appendChild(currButton.domNode);
  			dojo.place(currButton.domNode, "isCurrentButton_container","only");
      }
		}
	});
	//Room Assignment grid
	gridRA_store = new dojo.data.ItemFileWriteStore({
		data: {
			items: data.results.roomAssignment
		}
	});
	gridRA_store.onSetListener = dojo.connect(gridRA_store, "onSet", onSetFunction);
	gridRA_store.onDeleteListener = dojo.connect(gridRA_store, "onDelete", onDeleteFunction);
	gridRA_store.onNewListener = dojo.connect(gridRA_store, "onNew", onNewFunction);
	gridRA_store.storeKind = 'RA';
	gridRA_store.storeGrid = gridRA; //Add custom property storeGrid
	gridRA_store.raId = data.request;
	gridRA_store.raId["FACILITY_NUMBER"] = facNum;
	gridRA_store.roomStore = gridRoom.store; //Add custom property for the room data store
	gridRA_store.roomItem = gridRoom.getItem(0); //Save the room item to later get room data (org and org name)
	gridRA.selection.clear();  //Clear grid selection
	gridRA.setStore(gridRA_store);
	var roomOrg = gridRoom.store.getValue(gridRoom.getItem(0), "ORGANIZATION");
  if (checkAuthz(authz, facNum, roomOrg)) {
  	dojo.query(".editButton.addRow.roomChild").style({'visibility':''});
  } else {
  	dojo.query(".editButton.addRow.roomChild").style({'visibility':'hidden'});
  }
	if (data.results.roomAssignment.length > 0) { //Select first Room Assignment if there are room assignments
		gridRA.selection.addToSelection(0);
	}
}

//Function called when a row in a store has been deleted
function onDeleteFunction(deletedItem) {
	var theStore = this;
	if (deletedItem.FACILITY_CODE[0] !== null && deletedItem.ROOM_NUMBER[0] !== null) {
		var deleteRecord = {
			recordID:{},
			deleteRec:{},
			getHistoryString : function() {
				if (this.recordID.kind == 'RA') {
					return this.deleteRec['ASSIGNEE_ORGANIZATION'] + ', ' + this.deleteRec['ASSIGNEE_EMPLOYEE_ID'];
				} else if (this.recordID.kind == 'RAO') {
					return this.deleteRec['OCCUPANT_EID'];
				} else if (this.recordID.kind == 'RAU') {
					return this.deleteRec['FUNCTIONAL_USE_CODE'];
				} else if (this.recordID.kind == 'RAB') {
					return this.deleteRec['BUDGET_NUMBER'];
				}
			}
		}
		deleteRecord.recordID['kind'] = theStore.storeKind;
		deleteRecord.deleteRec['FACILITY_CODE'] = deletedItem.FACILITY_CODE[0];
		deleteRecord.deleteRec['ROOM_NUMBER'] = deletedItem.ROOM_NUMBER[0];
		if (deleteRecord.recordID['kind'] == 'RA') { //Add record keys for room assignment and room assignment use
			deleteRecord.deleteRec['ASSIGNEE_ORGANIZATION'] = deletedItem.ASSIGNEE_ORGANIZATION[0];
			deleteRecord.deleteRec['ASSIGNEE_EMPLOYEE_ID'] = deletedItem.ASSIGNEE_EMPLOYEE_ID[0];
		} else if (deleteRecord.recordID['kind'] == 'RAO') {  //Add record keys for room assignment use
			deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
			deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
			deleteRecord.deleteRec['OCCUPANT_EID'] = deletedItem.OCCUPANT_EID[0];
		} else if (deleteRecord.recordID['kind'] == 'RAU') {  //Add record keys for room assignment use
			deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
			deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
			deleteRecord.deleteRec['FUNCTIONAL_USE_CODE'] = deletedItem.FUNCTIONAL_USE_CODE[0];
		} else if (deleteRecord.recordID['kind'] == 'RAB') {  //Add record key for budget
			deleteRecord.deleteRec['ORGANIZATION'] = deletedItem.ORGANIZATION[0];
			deleteRecord.deleteRec['EMPLOYEE_ID'] = deletedItem.EMPLOYEE_ID[0];
			deleteRecord.deleteRec['FISCAL_YEAR_ENTERED'] = deletedItem.FISCAL_YEAR_ENTERED[0];
			deleteRecord.deleteRec['BUDGET_NUMBER'] = deletedItem.BUDGET_NUMBER[0];
		}
		var onDeleteDeferred = submitQuery(dojo.toJson({"deleteRecord":deleteRecord}),"common/php/deleteroominfo.php");
		onDeleteDeferred.addCallback(function(data) {
			crudCallback(data, deleteRecord);
			//Clear grid selections on successful delete
			var storeKind = deleteRecord.recordID['kind'];
  		if (storeKind == 'RA') {
  			gridRA.selection.clear();
  			//Clear RA subgrid datastores
  			gridRAO.noDataMessage = ' ';
  			gridRAO.setStore(gridRAO_storeEmpty); //ROOM ASSIGNMENT OCCUPANT GRID
  			gridRAU.noDataMessage = ' ';
      	gridRAU.setStore(gridRAU_storeEmpty); //ROOM ASSIGNMENT USE GRID
      	gridBdgt.noDataMessage = ' ';
      	gridBdgt.setStore(gridBdgt_storeEmpty); //BUDGET GRID
      	dojo.forEach([gridRAO,gridRAU,gridBdgt], function(grid) {
        	grid.layout.setColumnVisibility(0,false);
        });
  			gridRAO.selection.clear();
  			gridRAU.selection.clear();
  			gridBdgt.selection.clear();
  		} else if (storeKind == 'RAO') {
  			gridRAO.selection.clear();
  		} else if (storeKind == 'RAU') {
  			gridRAU.selection.clear();
  		} else if (storeKind == 'RAB') {
  			gridBdgt.selection.clear();
  		}
		});
		onDeleteDeferred.addErrback(function(data) {
			crudErrorback(deleteRecord.recordID['kind']);
		});
	}
	if (theStore.storeKind == 'RA') {
		dojo.forEach([gridRAO_store, gridRAU_store, gridBdgt_store],function(store) {
  		store.fetch({
  			query:{ORGANIZATION:deletedItem.ASSIGNEE_ORGANIZATION[0],EMPLOYEE_ID:deletedItem.ASSIGNEE_EMPLOYEE_ID[0]},
  			onComplete: function(items,request) {
  				var i;
  				//Disconnect the RAU grid onDelete function, delete the RAU value(s), reconnect the RAU grid onDelete function
  				dojo.disconnect(store.onDeleteListener);
  				for (i=0; i<items.length; i++) {
  					var item = items[i];
  					store.deleteItem(item);
  				}
  				store.onDeleteListener = dojo.connect(store, "onDelete", onDeleteFunction);
  			}
  		});
  	});
	}
}

//Function called when a field in a store has been set
function onSetFunction(setitem, attr, oldVal, newVal) {
	if (oldVal == newVal) {
		return;
	}
	console.log('UPDATED ITEM', setitem, attr, newVal);
	var store = setitem._S;

	//Update associated name value if ID value is updated/inserted
	if (dojo.indexOf(["ORGANIZATION","ASSIGNEE_ORGANIZATION","EMPLOYEE_ID","ASSIGNEE_EMPLOYEE_ID","OCCUPANT_EID","BUDGET_NUMBER"],attr) > -1) {
		dojo.disconnect(setitem._S.onSetListener);
		//Check store's idNameVals attribute for the new name value
		if ((store.idNameVals) && (store.idNameVals.idVal == newVal) && attr != "BUDGET_NUMBER") { //BudNo needs the FY to be set using the 'else' statement
  			setitem._S.setValue(setitem,store.idNameVals.attrVal,store.idNameVals.nameVal);
  		//} else {
  			//setitem._S.setValue(setitem,store.idNameVals.attrVal,"");
  	} else { //Check query store items for the new name value
			if (attr == "ASSIGNEE_ORGANIZATION" || attr == "ORGANIZATION") {
				var qStore = qStore_org;
				var descrAttr = 'ORG_NAME';
			} else if (attr == "BUDGET_NUMBER") {
				var qStore = qStore_bdgt;
				var oldFyVal;
				var descrAttr = 'BUDGET_NAME';
			} else if (attr == "ASSIGNEE_EMPLOYEE_ID" || attr == "EMPLOYEE_ID" || attr == "OCCUPANT_EID") {
				var qStore = qStore_emp;
				var descrAttr = 'EMPLOYEE_NAME';
			}
			var lookupAttr = qStore.getIdentityAttributes()[0];
			dojo.some(qStore._items,function(item) {
				if (item.i[lookupAttr] == newVal) {
					//console.log('newVal=',item);
					setitem._S.setValue(setitem,descrAttr,item.i['DESCR'].split(' - ')[1]);
					if (attr == "BUDGET_NUMBER") {
						oldFyVal = store.getValue(setitem,"FISCAL_YEAR_ENTERED"); //Keep old FY value
						var newFyVal = item.i['BienniumYear']
  					store.setValue(setitem,"FISCAL_YEAR_ENTERED",newFyVal);
  				}
					return true;
				}
			});
  	}
		setitem._S.onSetListener = dojo.connect(setitem._S, "onSet", onSetFunction);
	}

	//Test to see if this is a new row
	if (setitem.FACILITY_CODE[0] === null && setitem.ROOM_NUMBER[0] === null) {
		var failure = false;
		//if (setitem._S.storeKind.substr(0,2) != "R") {

  		if (setitem._S.storeKind == "RA") {
    		if (setitem.ASSIGNEE_ORGANIZATION[0] === null || setitem.ASSIGNEE_ORGANIZATION[0] == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (setitem.ASSIGNEE_EMPLOYEE_ID[0] === null || setitem.ASSIGNEE_EMPLOYEE_ID[0] == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (setitem.ASSIGNEE_ROOM_PERCENT[0] === null || setitem.ASSIGNEE_ROOM_PERCENT[0] == "" || setitem.ASSIGNEE_ROOM_PERCENT[0] == 0) {
    			failure = true;
    			//alert('you must set a room percent');
    		}
    	} else if (setitem._S.storeKind == "RAO") {
      	if (setitem.ORGANIZATION[0] === null || setitem.ORGANIZATION[0] == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (setitem.EMPLOYEE_ID[0] === null || setitem.EMPLOYEE_ID[0] == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (setitem.OCCUPANT_EID[0] === null || setitem.OCCUPANT_EID[0] == "") {
    			failure = true;
    			//alert('you must set an occupant eid');
    		}
    	} else if (setitem._S.storeKind == "RAU") {
      	if (setitem.ORGANIZATION[0] === null || setitem.ORGANIZATION[0] == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (setitem.EMPLOYEE_ID[0] === null || setitem.EMPLOYEE_ID[0] == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (setitem.FUNCTIONAL_USE_CODE[0] === null || setitem.FUNCTIONAL_USE_CODE[0] == "") {
    			failure = true;
    			//alert('you must set a functional use code');
    		}
    		if (setitem.FUNCTIONAL_USE_PERCENT[0] === null || setitem.FUNCTIONAL_USE_PERCENT[0] == "" || setitem.FUNCTIONAL_USE_PERCENT[0] == 0) {
    			failure = true;
    			//alert('you must set a functional use percent');
    		}
    	} else if (setitem._S.storeKind == "RAB") {
      	if (setitem.ORGANIZATION[0] === null || setitem.ORGANIZATION[0] == "") {
    			failure = true;
    			//alert('you must set an organization code');
    		}
    		if (setitem.EMPLOYEE_ID[0] === null || setitem.EMPLOYEE_ID[0] == "") {
    			failure = true;
    			//alert('you must set an employee id');
    		}
    		if (setitem.BUDGET_NUMBER[0] === null || setitem.BUDGET_NUMBER[0] == "") {
    			failure = true;
    			//alert('you must set a budget number');
    		}
    		if (setitem.PRIMARY_ROOM[0] === null || setitem.PRIMARY_ROOM[0] == "") {
    			failure = true;
    			//alert('you must set a primary room');
    		}
    	}
  	//}
		if (failure) {
			return;
		}

		var insertRecord = {
			recordID:{},
			insert:{}
		};

		//Fetch item from room store to identify facility_code and room_number values
		gridRoom_store.fetch({
			onComplete: function(items,request) {
				var i;
				var returnVar = {};
				for (i=0; i<items.length; i++) {
					var item = items[i];
					returnVar.FACILITY_CODE = gridRoom_store.getValue(item, 'FACILITY_CODE');
					returnVar.ROOM_NUMBER = gridRoom_store.getValue(item, 'ROOM_NUMBER');
				}
				//Disconnect the RA grid onSet function, set the new FAC_CODE, RMNO value(s), reconnect the RA grid onSet function
				dojo.disconnect(setitem._S.onSetListener);
				setitem._S.setValue(setitem, 'FACILITY_CODE', returnVar.FACILITY_CODE);
				setitem._S.setValue(setitem, 'ROOM_NUMBER', returnVar.ROOM_NUMBER);
				setitem._S.onSetListener = dojo.connect(setitem._S, "onSet", onSetFunction);
				//console.log(setitem);

				insertRecord.recordID['kind'] = setitem._S.storeKind;
				insertRecord.insert['FACILITY_CODE'] = returnVar.FACILITY_CODE;
				insertRecord.insert['ROOM_NUMBER'] = returnVar.ROOM_NUMBER;
				if (insertRecord.recordID['kind'] == 'RA') {
					insertRecord.insert['ASSIGNEE_ORGANIZATION'] = setitem.ASSIGNEE_ORGANIZATION[0];
					insertRecord.insert['ASSIGNEE_EMPLOYEE_ID'] = setitem.ASSIGNEE_EMPLOYEE_ID[0];
					insertRecord.insert['ASSIGNEE_ROOM_PERCENT'] = setitem.ASSIGNEE_ROOM_PERCENT[0];
					insertRecord.insert['DEPT_NOTE'] = store.getValue(setitem, "DEPT_NOTE");
					dojo.forEach([gridRAO_store, gridRAU_store, gridBdgt_store],function(store) {
						store.raId = {"FACILITY_NUMBER":facNum,
													"FACILITY_CODE":insertRecord.insert['FACILITY_CODE'],
													"ROOM_NUMBER":insertRecord.insert['ROOM_NUMBER'],
													"ORGANIZATION":insertRecord.insert['ASSIGNEE_ORGANIZATION'],
													"EMPLOYEE_ID":insertRecord.insert['ASSIGNEE_EMPLOYEE_ID']}
					});
				} else if (insertRecord.recordID['kind'] == 'RAO') {
					insertRecord.insert['ORGANIZATION'] = setitem.ORGANIZATION[0];
					insertRecord.insert['EMPLOYEE_ID'] = setitem.EMPLOYEE_ID[0];
					insertRecord.insert['OCCUPANT_EID'] = setitem.OCCUPANT_EID[0];
				} else if (insertRecord.recordID['kind'] == 'RAU') {
					insertRecord.insert['ORGANIZATION'] = setitem.ORGANIZATION[0];
					insertRecord.insert['EMPLOYEE_ID'] = setitem.EMPLOYEE_ID[0];
					insertRecord.insert['FUNCTIONAL_USE_CODE'] = setitem.FUNCTIONAL_USE_CODE[0];
					insertRecord.insert['FUNCTIONAL_USE_PERCENT'] = setitem.FUNCTIONAL_USE_PERCENT[0];
				} else if (insertRecord.recordID['kind'] == 'RAB') {
					insertRecord.insert['ORGANIZATION'] = setitem.ORGANIZATION[0];
					insertRecord.insert['EMPLOYEE_ID'] = setitem.EMPLOYEE_ID[0];
					insertRecord.insert['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");
					insertRecord.insert['BUDGET_NUMBER'] = setitem.BUDGET_NUMBER[0];
					insertRecord.insert['PRIMARY_ROOM'] = setitem.PRIMARY_ROOM[0];
				}

				var onInsertDeferred = submitQuery(dojo.toJson({"insertRecord":insertRecord}),"common/php/insertroominfo.php");
				onInsertDeferred.addCallback(function(data) {
					dojo.disconnect(store.onSetListener);
					store.setValue(setitem, "isInsert", false);
					store.onSetListener = dojo.connect(store, "onSet", onSetFunction);
					crudCallback(data, insertRecord);
					if (insertRecord.recordID['kind'] == 'RA') {
						var selectIndex = gridRA.oldSelectionIdx;
						gridRA.selection.setSelected(selectIndex, true);
  					//gridRA.evt.onSelected = dojo.connect(store.storeGrid,"onSelectionChanged",function() {grid_RA_onSelectionChanged(store.storeGrid.pane);});
  				}
				});
				onInsertDeferred.addErrback(function(data) {
					crudErrorback(insertRecord.recordID['kind']);
				});
			}
		});
		return;

	}


	jsonVal = {
		updateRecord:{
			recordID:{},
			update:{}
		}
	};
	//Populate record ID keys
	jsonVal.updateRecord.recordID['kind'] = setitem._S.storeKind;
	jsonVal.updateRecord.recordID['FACILITY_CODE'] = setitem.FACILITY_CODE[0];
	jsonVal.updateRecord.recordID['ROOM_NUMBER'] = setitem.ROOM_NUMBER[0];
	if (jsonVal.updateRecord.recordID['kind'] == 'RA') { //Add record keys for room assignment and room assignment use
		jsonVal.updateRecord.recordID['ASSIGNEE_ORGANIZATION'] = setitem.ASSIGNEE_ORGANIZATION[0];
		jsonVal.updateRecord.recordID['ASSIGNEE_EMPLOYEE_ID'] = setitem.ASSIGNEE_EMPLOYEE_ID[0];
	} else if (jsonVal.updateRecord.recordID['kind'] == 'RAO') {  //Add record keys for room assignment use
		jsonVal.updateRecord.recordID['ORGANIZATION'] = setitem.ORGANIZATION[0];
		jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = setitem.EMPLOYEE_ID[0];
		jsonVal.updateRecord.recordID['OCCUPANT_EID'] = setitem.OCCUPANT_EID[0];
	} else if (jsonVal.updateRecord.recordID['kind'] == 'RAU') {  //Add record keys for room assignment use
		jsonVal.updateRecord.recordID['ORGANIZATION'] = setitem.ORGANIZATION[0];
		jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = setitem.EMPLOYEE_ID[0];
		jsonVal.updateRecord.recordID['FUNCTIONAL_USE_CODE'] = setitem.FUNCTIONAL_USE_CODE[0];
	} else if (jsonVal.updateRecord.recordID['kind'] == 'RAB') {  //Add record key for budget
		jsonVal.updateRecord.recordID['ORGANIZATION'] = setitem.ORGANIZATION[0];
		jsonVal.updateRecord.recordID['EMPLOYEE_ID'] = setitem.EMPLOYEE_ID[0];
		jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED'] = store.getValue(setitem, "FISCAL_YEAR_ENTERED");
		jsonVal.updateRecord.recordID['BUDGET_NUMBER'] = setitem.BUDGET_NUMBER[0];
	}

	//If a record ID key is updated, set the key value to the old value
	if (attr in jsonVal.updateRecord.recordID) {
		//console.log('RA attr: ',jsonVal.updateRecord.recordID);
		jsonVal.updateRecord.recordID[attr] = oldVal;
		//Check if record is a Room Assignment record, and updatealert('crap'); associated Room Assignment Use(s) in the *grid store*. NOTE: Server scripts will update RAUs in the database, this functionality is not controlled on the client
		if (jsonVal.updateRecord.recordID['kind'] == 'RA') {
			if (attr == 'ASSIGNEE_ORGANIZATION') {
				var childKeyAttr = 'ORGANIZATION';
			} else if (attr == 'ASSIGNEE_EMPLOYEE_ID') {
				var childKeyAttr = 'EMPLOYEE_ID';
			} else {
				var childKeyAttr = attr;
			}
			dojo.forEach([gridRAO_store, gridRAU_store, gridBdgt_store],function(store) {
				store.raId[childKeyAttr] = newVal;
  			store.fetch({
  				query:{ORGANIZATION:jsonVal.updateRecord.recordID['ASSIGNEE_ORGANIZATION'],EMPLOYEE_ID:jsonVal.updateRecord.recordID['ASSIGNEE_EMPLOYEE_ID']},
  				onComplete: function(items,request) {
  					var i;
  					//Disconnect the store onSet function, set the new RA child value(s), reconnect the RA child grid onSet function
  					dojo.disconnect(store.onSetListener);
  					for (i=0; i<items.length; i++) {
  						var item = items[i];
  						store.setValue(item, childKeyAttr, newVal);
  					}
  					store.onSetListener = dojo.connect(store, "onSet", onSetFunction);
  				}
  			});
  		});
		}
	}
	//Define attribute and value to update
	jsonVal.updateRecord.update[attr] = newVal;

	//If BUDGET_NUMBER is being updated, also update FISCAL_YEAR_ENTERED
	if (attr == 'BUDGET_NUMBER') {
		jsonVal.updateRecord.update['FISCAL_YEAR_ENTERED'] = jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED']; //Add FISCAL_YEAR_ENTERED to update array
		jsonVal.updateRecord.recordID['FISCAL_YEAR_ENTERED'] = oldFyVal; //Set recordID val for FY back to original value
	}

	var onSetDeferred = submitQuery(dojo.toJson({"updateRecord":jsonVal.updateRecord}),"common/php/updateroominfo.php");
	onSetDeferred.addCallback(function(data) {
		crudCallback(data, jsonVal.updateRecord);
	});
	onSetDeferred.addErrback(function(data) {
		crudErrorback(jsonVal.updateRecord.recordID['kind']);
	});
}

//Callback for successful database operation (Create, Read, Update, Delete).  Commit changes to client-side data store.
function crudCallback(data, request) {
	var storeKind = request.recordID['kind'];
	//If no rows were updated, handle as error
	if (data.rowsUpdated === 0) {
		crudErrorback(storeKind);
		return;
	}

	postClientMessage({
		text:"Updated.",
		type:"success"
	});

	//Add entry to user actions history
	if ("update" in request) {
		for (var updatedField in request.update) {
			var updatedField_value = request.update[updatedField];

			var historyListRoomListFirstChild = dojo.byId('historyList').firstChild.firstChild;
    	if (historyListRoomListFirstChild.nodeName == 'LI') {
    		historyListRoomListFirstChild = dojo.create("ul", {"class":"historyListRoomChanges"},dojo.byId('historyList').firstChild,"first");
    	}

			dojo.create("li", {
					innerHTML: '<span class="fontBold">u: </span>' + updatedField + ': ' + updatedField_value,
					"class": "historyRoomChange"
				},
				historyListRoomListFirstChild,
				"first");
		}
	} else if ("deleteRec" in request) {
		var historyListRoomListFirstChild = dojo.byId('historyList').firstChild.firstChild;
  	if (historyListRoomListFirstChild.nodeName == 'LI') {
  		historyListRoomListFirstChild = dojo.create("ul", {"class":"historyListRoomChanges"},dojo.byId('historyList').firstChild,"first");
  	}
  	dojo.create("li", {
  			innerHTML: '<span class="fontBold">d: </span>' + request.getHistoryString(),
  			"class": "historyRoomChange"
  		},
  		historyListRoomListFirstChild,
  		"first");
	} else if ("insert" in request) {
		var historyListRoomListFirstChild = dojo.byId('historyList').firstChild.firstChild;
  	if (historyListRoomListFirstChild.nodeName == 'LI') {
  		historyListRoomListFirstChild = dojo.create("ul", {"class":"historyListRoomChanges"},dojo.byId('historyList').firstChild,"first");
  	}
  	dojo.create("li", {
  			innerHTML: '<span class="fontBold">i: </span>' + request.insert[(storeKind == 'RA' ? 'ASSIGNEE_ORGANIZATION' : 'ORGANIZATION')] + ', ' + request.insert[(storeKind == 'RA' ? 'ASSIGNEE_EMPLOYEE_ID' : 'EMPLOYEE_ID')],
  			"class": "historyRoomChange"
  		},
  		historyListRoomListFirstChild,
  		"first");
	}

	if (storeKind == 'R') {
		gridRoom_store.save();
	} else if (storeKind == 'RA') {
		gridRA_store.save();
		if (gridRAO_store.isDirty()) {
			gridRAO_store.save();
		}
		if (gridRAU_store.isDirty()) {
			gridRAU_store.save();
		}
		if (gridBdgt_store.isDirty()) {
			gridBdgt_store.save();
		}
	} else if (storeKind == 'RAO') {
		gridRAO_store.save();
	} else if (storeKind == 'RAU') {
		gridRAU_store.save();
	} else if (storeKind == 'RAB') {
		gridBdgt_store.save();
	}
}

//Callback for failed database operation (Create, Read, Update, Delete).  Rollback changes to client-side data store.
function crudErrorback(storeKind) {

	postClientMessage({
		text:"Not updated.",
		type:"failure"
	});

	if (storeKind == 'R') {
		gridRoom_store.revert();
	} else if (storeKind == 'RA') {
		gridRA_store.revert();
		if (gridRAO_store.isDirty()) {
			gridRAO_store.revert();
		}
		if (gridRAU_store.isDirty()) {
			gridRAU_store.revert();
		}
		if (gridBdgt_store.isDirty()) {
			gridBdgt_store.revert();
		}
	} else if (storeKind == 'RAO') {
		gridRAO_store.revert();
	} else if (storeKind == 'RAU') {
		gridRAU_store.revert();
	} else if (storeKind == 'RAB') {
		gridBdgt_store.revert();
	}
}

//Check the currentAnchor variable for changes, if changed set new layer defs, if null start ini
function setFacAndFloorToHash() {
	if (currentAnchor != document.location.hash) {
		if (currentAnchor === null) {
			var initialLoad = true;
		} else {
			var initialLoad = false;
		}
		currentAnchor = document.location.hash;
		var hashVars = dojo.queryToObject(document.location.hash.slice(1)); //Get hash string as object
		if (hashVars.FACNUM) {
			if (hashVars.FLOOR) {
				setLayerDefs(roomsServiceLayer, hashVars.FACNUM, hashVars.FLOOR, hashVars.ROOM);
			} else {
				setLayerDefs(roomsServiceLayer, hashVars.FACNUM, '', hashVars.ROOM);
			}
		} else {
			setLayerDefs(roomsServiceLayer, '', '', '');
		}
		if (initialLoad == true) {  //Check if INITIAL LOAD
			//Submit query to build facility select box
			var setFacSelDeferred = submitQuery_get({"FACNUM":''},"mapviewer/php/listfacs.php");
			setFacSelDeferred.addCallback(function(data) {
				setFacSelect(data.results);
			});
			setFloorSelect([]);

			//Add rooms service layer on initial load
			//console.log('loading layers..');
			map.addLayer(roomsServiceLayer);
			//console.log('rooms service loaded');
			map.addLayer(facsGraphicsLayer);
			//console.log('fac gfx loaded');
			map.addLayer(roomsGraphicsLayer);
			//console.log('room gfx loaded');
			map.addLayer(roomInfoGraphicsLayer);
			//console.log('roomsInfo gfx loaded');
			map.addLayer(roomsFeatureLayer);
			//console.log('roomFeats loaded');
		}
	}
}

//Change url hash
function setHash(new_facnum, new_floor, new_room) {
	if (new_facnum == '' && new_floor == '') {
		document.location.hash = '#';
	} else {
		//document.location.hash = '#FACNUM=' + new_facnum + '&FLOOR=' + new_floor;
		var hashObj = dojo.queryToObject(dojo.hash());
		if (new_room) {
			hashObj.ROOM = new_room;
		} else {
			if (hashObj.FACNUM !== new_facnum || hashObj.FLOOR !== new_floor) {
				delete hashObj.ROOM;
			}
		}
		hashObj.FACNUM = new_facnum;
		hashObj.FLOOR = new_floor;
		dojo.hash(dojo.objectToQuery(hashObj));
	}
}

//Formatter function for creating the edit cell remove row button
function formatterEdit(val, rowIdx, cell) {
	//console.log([this,val,rowIdx,cell]);
	var editDiv = '<div dojoType="dijit.form.Button" title="Delete this record" showLabel="true" class="editButton deleteRow" onClick="removeRow(' + rowIdx + ',\'' + cell.grid.id + '\')">x</div>';
	if (cell.grid.store.storeKind == 'RA') {
  	var roomItem = gridRoom.getItem(0);
  	var roomItem_org = gridRoom.store.getValue(roomItem, "ORGANIZATION");
		var raItem = cell.grid.getItem(rowIdx);
		var raItem_org = cell.grid.store.getValue(raItem, "ASSIGNEE_ORGANIZATION");
  	if (!(checkAuthz(authz, facNum, roomItem_org, raItem_org))) {
  		var editDiv = '';
  	}
  }
	return editDiv;
}

//Formatter function for percentage fields
function formatPercent(val, rowIdx, cell) {
	cell.customClasses.push('alignRight');
	//Get the total of grid percentages
	var grid = cell.grid;
	var gridPercentTotal = 0;
	if (grid.store.storeKind == 'RA') {
		var percentFieldName = 'ASSIGNEE_ROOM_PERCENT';
	} else if (grid.store.storeKind == 'RAU') {
		var percentFieldName = 'FUNCTIONAL_USE_PERCENT';
	}
	for (var i=0;i<grid.rowCount;i++) {
		gridPercentTotal += parseInt(grid.store.getValue(grid.getItem(i), percentFieldName));
	}
	//console.log(grid.store.storeKind, val, gridPercentTotal);
	if (val === null || val == '' || val <= 0 || val > 100 || gridPercentTotal === NaN || gridPercentTotal < 99 || gridPercentTotal > 100) {
		cell.customClasses.push('nullErrorClass');
	}
	return isNaN(val) ? '...' : val + '%';
}

//Create grid from supplied store
function addGrid(gridProps, divId) {
	var newGrid = new dojox.grid.DataGrid(
		gridProps,
		divId
	);
	return newGrid;
}

//Check authorizations for RA, RAU, RAO, RAB tables
function checkChildAuthz(inCell, inRowIndex) {
	//console.log(this._canEdit, inCell, inRowIndex);
	if (this._canEdit == true) {
		if (inCell.grid.store.storeKind == "RA") {
			var editItem = this.getItem(inRowIndex);
			var editItem_org = this.store.getValue(editItem, "ASSIGNEE_ORGANIZATION");
		} else {
			var editItem = this.getItem(inRowIndex);
			var editItem_org = this.store.getValue(editItem, "ORGANIZATION");
		}
		var roomItem = gridRoom.getItem(0);
		var roomItem_org = gridRoom.store.getValue(gridRoom.getItem(0), "ORGANIZATION");
		if (checkAuthz(authz, facNum, roomItem_org, editItem_org)) {
			return true;
		} else {
			postClientMessage({
				text:"Not authorized.",
				type:"failure"
			});
		}
	}
	return false;
}

//Get the current facility description from the facSelect dijit
function getCurrentFacDesc() {
	var facSel = dijit.byId("facSelect");
	if (facSel && facSel.item) {
		var desc = facSel.store.getValue(facSel.item,"FACDESC");
		return desc;
	} //else {
		//return 'FacNum: ' + facNum;
	//}
}

function setNewFacDesc() {
	facDesc = getCurrentFacDesc();
	if (facDesc) {
		dojo.byId("chartTitleNode-fac").innerHTML = facDesc;
		document.title = 'GeoSIMS Map Viewer: ' + facDesc + ', Floor ' + floor; //Set page title
	} else {
		dojo.byId("chartTitleNode-fac").innerHTML = "No facility";
	}
}

function setNewFloorDesc() {
	if (floor) {
  	dojo.byId("chartTitleNode-floor").innerHTML = 'Floor ' + floor;
  } else {
  	dojo.byId("chartTitleNode-floor").innerHTML = 'No floor';
  }
}

//Populate Facility select with data in array
function setFacSelect(facData) {
	var facStore = new dojo.data.ItemFileReadStore({
		data: {
			identifier: 'FACILITY_NUMBER',
			items: facData
		}
	});
	facSelDijit = new CustomFilteringSelect({
			id: "facSelect",
			name: "facilitySel",
			value: facNum,
			style: "width:17em;margin-bottom: 4px;",
			required: false,
			autoComplete: true,
			selectOnClick:true,
			queryExpr: "*${0}*",
			store: facStore,
			searchAttr: "FACDESC",
			labelType: "text",
			//labelAttr: "FACILITY_NUMBER",
			highlightMatch:"all",
			onChange: function(newValue) {
				//console.log([newValue,floor]);
				this.focusNode.blur(); //Lose focus on select
				if (newValue != "") {
					setHash(newValue,floor);
				} else {
					this.attr('value',facNum);
				}
			}
		},
		"facSelect");
	setNewFacDesc();
}

//Populate Floor select with data in array
function setFloorSelect(floorData) {
	var floorStore = new dojo.data.ItemFileReadStore({
		data: {
			identifier: 'FLOOR_CODE',
			items: floorData
		}
	});
	if (!(dijit.byId('floorSelect'))) {  //Create dijit if it doesn't exist (this is the initial load, one-time event)
		floorSelDijit = new CustomFilteringSelect({
			id: "floorSelect",
			name: "floorSel",
			//value: floor,
			//displayedValue: floor,
			style: "width:3em;vertical-align:text-top",
			required: false,
			autoComplete: true,
			selectOnClick:true,
			//queryExpr: "*${0}*",
			store: floorStore,
			searchAttr: "FLOOR_CODE",
			labelType: "text",
			//labelAttr: "FLOOR_CODE",
			highlightMatch:"all",
			onChange: function(newValue) {
				//console.log([facNum,newValue]);
				this.focusNode.blur(); //Lose focus on select
				if (newValue != "") { //Set new floor value to hash if valid
					setHash(facNum,newValue);
				} else {  //If value is invalid set value of select dijit back to current floor
					this.attr('value',floor);
				}
			}
		},
		"floorSelect");
	} else { //If dijit exists, just replace the store (this occurs when the facility changes)
		var floorSelDijit = dijit.byId('floorSelect');
		floorSelDijit.store = floorStore;
	}
	//Set floor select dijit value
	floorStore.fetch({
		onComplete: function(items,request) {
			var setFloorBool = [false, false, false];
			dojo.forEach(items,function(item) {
				if (floorStore.getValue(item, 'FLOOR_CODE') == floor) {
					floorSelDijit.attr('value', floor);
					setFloorBool[0] = true;
				} else if (floorStore.getValue(item, 'FLOOR_CODE') == '01') {
					setFloorBool[1] = true;
				} else if (floorStore.getValue(item, 'FLOOR_CODE') == '0G') {
					setFloorBool[2] = true;
				}
			});
			if (!(setFloorBool[0])) { 			//If current floor code not found in floorStore
				if (setFloorBool[1]) { 				//If floor code '01' is found in floorStore, set to '01'
					floorSelDijit.attr('value', '01');
				} else if (setFloorBool[2]) { 			//If floor code '0G' is found in floorStore, set to '0G'
					floorSelDijit.attr('value', '0G');
				} else { 					//If neither floor code '01' or floor code '0G' are to be found in floorStore, set to first value
					floorSelDijit.attr('value', floorStore.getValue(items[0], 'FLOOR_CODE'));
				}
			}
		}
	});
	setNewFloorDesc();
}

//Create chart from data
function generateChart(data, domNodeName) {
	//Get labels and values
	var orgLabels = [];
	var sqftLabels = [];
	var idx = 1;
	for (var orgDept in data['DEPT_SQFT']) {
		var orgLabel = {value:idx,text:orgDept};
		orgLabels.push(orgLabel);
		var sqftLabel = {value:idx,text:dojo.number.format(data['DEPT_SQFT'][orgDept]) + ' sqft'};
		sqftLabels.push(sqftLabel);
		idx++;
	};

	//Set size of containing div to properly size chart and bars
	var barSize = 28; //Bar thickness in px
	var barGap = 3; //Gap between bars in px
	var rowCount = idx - 1;
	var divHeight = 75 + rowCount * (barSize + barGap);
	dojo.attr(domNodeName, "style", {
        height: divHeight + 'px'
	});

	var chart = new dojox.charting.Chart(domNodeName);

	chart.setTheme(dojox.charting.themes.Distinctive);
	chart.addPlot("default", {
		type: "StackedBars",
		gap: barGap,
		minBarSize: barSize,
		maxBarSize: barSize,
		animate: { duration: 750 }
	});
	chart.addPlot("other", {
		type: "StackedBars",
		vAxis: "y2",
		hAxis: "x2"
	});

	/*chart.addPlot("chartgrid", {
		type: "Grid",
    hMajorLines: false,
    hMinorLines: false,
    vMajorLines: true,
    vMinorLines: false});*/


	/*var micros, minors = false;
	if (orgLabels.length > 9) {
		minors = true;
	}*/

	chart.addAxis("y",{vertical: true, labels: orgLabels, fixLower: "none", fixUpper: "none", majorTickStep: 1, minorTicks: false, microTicks: false, majorTick:{length: 3}});
	chart.addAxis("x", {leftBottom: false, fixLower: "none", fixUpper: "none", minorTicks: false, microTicks: false, majorTick:{length: 2}, includeZero: true});
	chart.addAxis("y2",{vertical: true, leftBottom: false, labels: sqftLabels, fixLower: "none", fixUpper: "none", majorTickStep: 1, minorTicks: false, microTicks: false, majorTick:{length: 3}});
	chart.addAxis("x2");
	var spaceCategories = data["SPACE_CATEGORIES"];

	var colors = classColors["SPACE_CATEGORY"];
	for (var spaceCategory in spaceCategories) {
		//console.log([spaceCategory,spaceCategories[spaceCategory]]);
		chart.addSeries(spaceCategory, spaceCategories[spaceCategory], {plot: "default", stroke: {color:(colors[spaceCategory] ? colors[spaceCategory]["stroke"] : "#FFF"), width:1}, fill: (colors[spaceCategory] ? colors[spaceCategory]["fill"] : "rgb(255, 255, 255)")});
	}
	var emptyArray = [];
	for (var n = 0; n<orgLabels.length;n++) {
		emptyArray.push(0);
	}
	chart.addSeries(null, emptyArray, {plot: "other", legend:false});

  var anim_b = new dojox.charting.action2d.Highlight(chart, "default");
  var anim_c = new dojox.charting.action2d.Tooltip(chart, "default", {text : chartTooltipFunc});

  return chart;
}

//Create data for chart tooltip
function chartTooltipFunc(chartObj) {
	var chartObjAttr = chartObj.run.name;
	var chartObjVal = dojo.number.format(chartObj.run.data[chartObj.index]);
	//console.log(chartObj, chartObjVal);
	return chartObjAttr + ': <span style="font-weight:bold;">' + chartObjVal + '</span> sqft';
}

function maxOffset(map, pixelTolerance) {
	return Math.floor(map.extent.getWidth() / map.width) * pixelTolerance;
}


var currentRoomClassification = {
	classColors : {},
	chartObjs: []
}

//Get Room Attribute(s) and color rooms
function getRoomAttribute(returnVars, whereVars, chartObj) {

	//Iterate through returnVars array
	for (var i=0; i<3; i++) {
		if (returnVars[i] != null) {
			//Check to see if class field exists in layer. if it does not, add it
  		if (!(roomsFeatureLayer._getField(returnVars[i]))) {
    		roomsFeatureLayer.fields.push({"name":returnVars[i]});
    	}
    }
	}

	//Check to see if unique value renderer is set correctly
	var isNewRenderer = false;
	if (!whereVars.ORS || (roomsFeatureLayer.renderer.declaredClass != "esri.renderer.UniqueValueRenderer") || ((roomsFeatureLayer.renderer.attributeField != returnVars[0]) || (roomsFeatureLayer.renderer.attributeField2 != returnVars[1]) || (roomsFeatureLayer.renderer.attributeField3 != returnVars[2]))) {
		//console.log('set new renderer');
		isNewRenderer == true;
		roomsFeaturesClassRenderer = new esri.renderer.UniqueValueRenderer((whereVars.ORS ? symbol : errorSymbol), returnVars[0], returnVars[1] ? returnVars[1] : null, returnVars[2] ? returnVars[2] : null, ":"); //Initialize once?
		roomsFeatureLayer.setRenderer(roomsFeaturesClassRenderer);
		dojo.byId("legend").innerHTML = '';

		//Set legend title
		dojo.byId("legendTitle").innerHTML = dijit.byId("classifyMenuItem-" + roomsFeatureLayer.renderer.attributeField).label;

		dojo.style("legend_container","display","inline");
		if (currentRoomClassification.chartObjs.length > 0) { //Reset stroke of active bar chart items
			dojo.forEach(currentRoomClassification.chartObjs, function(obj) {
				if (obj.shape.fillStyle.toHex() == "#ffffff") {
					obj.shape.setStroke({color:"#999"});
				} else {
					obj.shape.setStroke({color:"#FFF"});
				}
			});
			currentRoomClassification.chartObjs = [];
		}
	}

	//Hide legend and do not query server if no FACNUM or R.FLOOR_CODE
	if (!(whereVars["ANDS"]["FACNUM"] && whereVars["ANDS"]["R.FLOOR_CODE"])) {
		dojo.byId("legend").innerHTML = '';
		dojo.style("legend_container","display","none");
		return;
	}

  var roomsByAttributeDeferred = submitQuery(dojo.toJson({"RETURN":returnVars.concat(["R.ROOM_NUMBER"]),"WHERE":whereVars}),"mapviewer/php/roomsByAttribute.php");
	roomsByAttributeDeferred.addCallback(function(data) {
		esri.hide(dojo.byId("loadingImg"));
		var rendererValues = {
			"newVals":[],
			"oldVals":[]
		};





  	//dojo.forEach(roomsFeatureLayer.graphics, function(feature) {
  	//	if (!(dojo.some(data, function(qRoom) {
  	dojo.forEach(data, function(qRoom) {
  		if (!(dojo.some(roomsFeatureLayer.graphics, function(feature) {
  			if (feature.attributes.ROOMNUMBER == qRoom.ROOM_NUMBER) {
  				var idArgs = {"id":""};
  				dojo.forEach(returnVars, function(attr) {
  					var columnName = attr.split('.',2)[1];
    				//console.log([feature.attributes.ROOMNUMBER, attr, qRoom[columnName]]);
    				var value = (qRoom[columnName] ? qRoom[columnName] : (qRoom['ALT_DESC'] ? qRoom['ALT_DESC'] : null));
    				//Transform confirm date value
						if (columnName == 'CONFIRM_DATE') {
    					(value == -1 ? value = "Never confirmed" : (Number(value) == 0 ? value = "Not applicable" : (Number(value) < 90 ? value = "Within 3 months" : (Number(value) < 365 ? value = "Within a year" : value = "Over a year"))));
    				}
						//Transform occupancy value
						if (columnName == 'Occupancy') {
    					(!value ? value = "Not applicable" : (Number(value) == -1 ? value = "Capacity not set" : (Number(value) == 0 ? value = "Vacant" : (Number(value) < 1 ? value = "Under occupied" : (Number(value) == 1 ? value = "Fully occupied" : value = "Over occupied")))));
    				}

    				feature.attributes[attr] = value; //Assign returned value to attribute

    				if (idArgs.id.length != 0) {
							idArgs.id += ':';
						}
						idArgs.id += value;
						idArgs[attr] = value;
    			});
    			//If value does not exist in the layer renderer's values, add value
    			if (dojo.indexOf(roomsFeatureLayer.renderer.values, idArgs.id) == -1) {
    				rendererValues.newVals.push(idArgs.id); //Save id arg as new renderer value
    				var classStrokeRgb = new dojo.Color([50,50,50]);
    				//Get renderer color.  If color is not defined, create and save random color
    				if (classColors[returnVars[0].split('.',2)[1]] && classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]]) {
  						var classFillRgb = dojo.colorFromString(classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].fill);
  						if (classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].roomStroke) {
  							classStrokeRgb = dojo.colorFromString(classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].roomStroke);
  						}
  					} else {
  						if (typeof currentRoomClassification.classColors[returnVars[0].split('.',2)[1]] === 'undefined') {
  							currentRoomClassification.classColors[returnVars[0].split('.',2)[1]] = {};
  						}
  						if (typeof currentRoomClassification.classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]] !== 'undefined') {
  							var classFillRgb = currentRoomClassification.classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].fill;
  						} else {
  							currentRoomClassification.classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]] = {};
  							var classFillRgb = new dojo.Color([randomFromTo(50,250),randomFromTo(50,250),randomFromTo(50,250)]);
								currentRoomClassification.classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].fill = classFillRgb;
							}
  					}
  					classFillRgb.a = .5; //Set alpha/transparency
						var newClassSymbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, classStrokeRgb, 1), new dojo.Color([classFillRgb.r,classFillRgb.g,classFillRgb.b,classFillRgb.a]));
						//console.log(idArgs);
						roomsFeaturesClassRenderer.addValue(idArgs.id,newClassSymbol);

		    		if (chartObj) {
        			//chartObj.shape.setStroke({color:"#000"});
        			currentRoomClassification.chartObjs.push(chartObj);
        		}

						var legendItem_attr = idArgs[returnVars[0]];
						if (!(dojo.byId('legItem-' + legendItem_attr))) {
							dojo.style("legend_container","display","inline"); //Show legend div. redundant? not needed?
  						//Add legend item
  						var newLegendItm = dojo.create("div", {
          			innerHTML: '<div class="legendItem-box" style="background-color:' + dojo.blendColors(classFillRgb,new dojo.Color([255,255,255]),.5).toHex() + ';"></div>' + legendItem_attr,
          			"class": "legendItem",
          			"id": "legItem-" + legendItem_attr,
      					"data-rendererValue-0": legendItem_attr
          		},
          		"legend",
          		"last");
          	}
  				} else { //If the renderer value exists in renderer
  					if (dojo.indexOf(rendererValues.newVals, idArgs.id) == -1) { //If the renderer value isn't new from this database query
  						rendererValues.oldVals.push(idArgs); //Save id arg as an old renderer value
  					}
  				}
  				return true;
  			}
  		}))) {
  			//if (!(whereVars.ORS) || isNewRenderer) { //If this is a query of all rooms on a floor, or a new renderer has been set
    		//	dojo.forEach(returnVars, function(attr) { //If room number isn't found in data results set attributes to ''
    		//		feature.attributes[attr] = '';
    		//	});
    		//}
  		}
  	});
  	//If no new renderer values were returned by the query, remove all old values that were returned by the query
  	if (whereVars.ORS && rendererValues.newVals.length == 0) {
  		dojo.forEach(rendererValues.oldVals, function(idArgs) {
  			roomsFeaturesClassRenderer.removeValue(idArgs.id); //Remove renderer value

  			//Check to see if necessary to remove legend value
  			var legendVal = idArgs.id.split(':')[0];
  			if (!(dojo.some(roomsFeaturesClassRenderer.values, function(rVal) {
  				var rValPrimary = rVal.split(':')[0];
  				if (rValPrimary == legendVal && rVal != idArgs.id) {
  					return true;
  				}
  			}))) {
    			var legendItem_attr = idArgs[returnVars[0]];
    			if (dojo.byId('legItem-' + legendItem_attr)) {
    				dojo.destroy(dojo.byId('legItem-' + legendItem_attr));
    			}
  			}

    		if (chartObj) {
    			var objIdx = dojo.indexOf(currentRoomClassification.chartObjs,chartObj);
    			if (objIdx > -1) {
						currentRoomClassification.chartObjs.splice(objIdx, 1);
    			}

    			//console.log(classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].stroke);
    			//chartObj.shape.setStroke({color:classColors[returnVars[0].split('.',2)[1]][idArgs[returnVars[0]]].stroke});
    		}

    		//Reset attributes for features belonging to this renderer
    		dojo.forEach(roomsFeatureLayer.graphics, function(feature) {
      		if (!(dojo.some(returnVars, function(attr) {
      			if (!(feature.attributes[attr] == idArgs[attr])) {
      				return true;
      			}
      		}))) {
      			dojo.forEach(returnVars, function(attr) {
      				feature.attributes[attr] = '';
      			});
      			//console.log(feature);
      		}
    		});
  		});
  	} /**else {
	  	if (whereVars.ORS && currentRoomClassification.RETURN && currentRoomClassification.RETURN.join() == returnVars.join()) {
    		currentRoomClassification["WHERE"]["ANDS"] = whereVars["ANDS"];
    		currentRoomClassification["WHERE"]["ORS"] = currentRoomClassification["WHERE"]["ORS"].concat(whereVars["ORS"]);
    		console.log(currentRoomClassification["WHERE"]["ORS"]);
    	} else {
    		currentRoomClassification["RETURN"] = returnVars;
    		currentRoomClassification["WHERE"] = whereVars;
    	}
		}**/

		if (whereVars.ORS) {
			currentRoomClassification["RETURN"] = null;
			currentRoomClassification["WHERE"] = null;
		} else {
			currentRoomClassification["RETURN"] = returnVars;
    	currentRoomClassification["WHERE"] = whereVars;
		}

  	//If number of legend items is zero, hide legend
  	if (dojo.query('#legend .legendItem').length == 0) {
			dojo.byId("legend").innerHTML = '';
			dojo.style("legend_container","display","none");
      //classSel.set("value","NONE"); //Set value of classSel to 'NONE'
  	}
  	roomsFeatureLayer.hide();
		roomsFeatureLayer.show();
	});
	esri.show(dojo.byId("loadingImg"));
}

function randomFromTo(from, to){
	return Math.floor(Math.random() * (to - from + 1) + from);
}

	//Set space category colors
var classColors = {
	"ORG_NAME":{
		"Nonassignable":{
			"fill":"#DDD",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"Unknown":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"Not UW Space":{
			"fill":"#666"
		}
	},
	"ORG_DEPT_NAME":{
		"Nonassignable":{
			"fill":"#DDD",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"Unknown":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"Not UW Space":{
			"fill":"#666"
		}
	},
	"ORG_COLLEGE_NAME":{
		"Nonassignable":{
			"fill":"#DDD",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"Unknown":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"Not UW Space":{
			"fill":"#666"
		}
	},
	"PRIMARY_USE":{
		"PUBLIC CIRCULATION":{
			"fill":"#EEE",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"MECHANICAL AREA":{
			"fill":"#888"
		},
		"ELECTRICAL CLOSET":{
			"fill":"#888"
		},
		"TELECOMMUNICATIONS":{
			"fill":"#888"
		},
		"PUBLIC RESTROOM":{
			"fill":"#CCC",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"CUSTODIAL SUPPLY":{
			"fill":"#AAA",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"JANITOR ROOM":{
			"fill":"#AAA",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"TRASH ROOM":{
			"fill":"#AAA",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"NOT CLASSIFIED":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"UNASSIGNED AREA":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"ALTER/CONVERSION":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"UNFINISHED AREA":{
			"fill":"#F00",
			"roomStroke":"#F00"
		},
		"STRUCTURAL AREA":{
			"fill":"#444",
		}
	},
	"SPACE_CATEGORY":{
		"Building Services":{
			"stroke":"#FFF",
			"fill":"#CCC",
			"roomStroke":"rgba(121,121,121,.3)"
		},
		"Circulation":{
			"stroke":"#FFF",
			"fill":"#EEE",
			"roomStroke":"rgba(221,221,221,.3)"
		},
		"Mechanical":{
			"stroke":"#FFF",
			"fill":"#888"
		},
		"Structural":{
			"stroke":"#FFF",
			"fill":"#444"
		},
		"Instruction":{
			"stroke":"#FFF",
			"fill":"rgb(154, 108, 163)"
		},
		"Instruction Support":{
			"stroke":"#FFF",
			"fill":"rgb(184, 138, 193)"
		},
		"Research":{
			"stroke":"#FFF",
			"fill":"rgb(88, 139, 78)"
		},
		"Research Support":{
			"stroke":"#FFF",
			"fill":"rgb(158, 189, 128)"
		},
		"Office":{
			"stroke":"#FFF",
			"fill":"rgb(89, 160, 189)"
		},
		"Office Support":{
			"stroke":"#FFF",
			"fill":"rgb(159, 220, 239)"
		},
		"Conference":{
			"stroke":"#FFF",
			"fill":"rgb(89, 89, 149)"
		},
		"Study":{
			"stroke":"#FFF",
			"fill":"rgb(239, 195, 250)"
		},
		"Special Use":{
			"stroke":"#FFF",
			"fill":"rgb(240,214,19)"
		},
		"General Use":{
			"stroke":"#FFF",
			"fill":"rgb(247,220,156)"
		},
		"Central Support":{
			"stroke":"#FFF",
			"fill":"rgb(240, 238, 187)"
		},
		"Health Care":{
			"stroke":"#FFF",
			"fill":"rgb(232,242,116)"
		},
		"Residential":{
			"stroke":"#FFF",
			"fill":"rgb(72,240,161)"
		},
		"Unclassified":{
			"stroke":"#FFF",
			"roomStroke":"#F00",
			"fill":"#F00"
		}
	},
	"CONFIRM_DATE":{
		"Within 3 months":{
			"fill":"rgba(0,255,0,.5)"
		},
		"Within a year":{
			"fill":"rgba(150,255,50,.5)"
		},
		"Over a year":{
			"fill":"rgba(255,0,0,.5)"
		},
		"Never confirmed":{
			"fill":"rgba(128,0,0,.5)"
		},
		"Not applicable":{
			"fill":"rgba(221,221,221,.5)"
		}
	},
	"Occupancy":{
		"Fully occupied":{
			"fill":"rgba(0,255,0,.5)"
		},
		"Over occupied":{
			"fill":"rgba(150,255,50,.5)"
		},
		"Under occupied":{
			"fill":"rgba(255,255,0,.5)"
		},
		"Vacant":{
			"fill":"rgba(255,0,0,.5)"
		},
		"Capacity not set":{
			"fill":"rgba(255, 153, 0,.5)"
		},
		"Not applicable":{
			"fill":"rgba(255,255,255,0)"
		}
	}
};
dojo.addOnLoad(dojoOnLoad);  //Everything starts here..
