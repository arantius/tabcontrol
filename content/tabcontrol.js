var gTabControl={
/********************************* VARIABLES *********************************/

prefObj: Components.classes['@mozilla.org/preferences-service;1']
		.getService(Components.interfaces.nsIPrefBranch),

/****************************** EVENT LISTENERS ******************************/

onLoad:function() {
	//attach other listeners
	window.addEventListener('unload', gTabControl.onUnLoad, false);

	//in options window, no gBrowser, no need to do the rest
	if ('undefined'==typeof gBrowser) return;

	//mangle removeTab function
	gBrowser.origRemoveTab=gBrowser.removeTab;
	gBrowser.removeTab=gTabControl.removeTab;

	//mangle addTab function
	gBrowser.origAddTab=gBrowser.addTab;
	gBrowser.addTab=gTabControl.addTab;

	//initial tabs' (or tabs') width
	for (var i=0, t=null; t=gBrowser.mTabContainer.childNodes[i]; i++) {
		t.minWidth=gTabControl.getPref('int', 'tabcontrol.tabMinWidth');
		t.maxWidth=gTabControl.getPref('int', 'tabcontrol.tabMaxWidth');
	}

	//get reference to string bundle
	var bundle=document.getElementById('tabcontrol-bundle');

	//insert item to duplicate tab
	var duplicateTabItem=document.createElement('menuitem');
	duplicateTabItem.setAttribute('label', bundle.getString('duplicateTab'));
	duplicateTabItem.setAttribute('accesskey', bundle.getString('duplicateTabAccessKey'));
	duplicateTabItem.setAttribute('oncommand', 'gTabControl.duplicateTab();');

	var tabMenu=document
		.getAnonymousElementByAttribute(gBrowser, 'anonid', 'tabContextMenu');
	tabMenu.insertBefore(duplicateTabItem, tabMenu.firstChild);
},

onUnLoad:function() {
	//remove our listeners
	window.removeEventListener('load', gTabControl.onLoad, false);
	window.removeEventListener('unload', gTabControl.onUnLoad, false);
},

/****************************** TAB MANIPULATION *****************************/

addTab:function(
	aURI, aReferrerURI, aCharset, aPostData, aOwner, aAllowThirdPartyFixup
) {
	var posRight=gTabControl.getPref('bool', 'tabcontrol.posRightOnAdd');
	var currTab=gBrowser.mCurrentTab;

	//call the browser's real add tab function
	var newTab=gBrowser.origAddTab(
		aURI, aReferrerURI, aCharset, aPostData, aOwner, aAllowThirdPartyFixup
	);

	//shift the new tab into position
	if (posRight && newTab.tPos!=currTab._tPos+1) {
		gBrowser.moveTabTo(newTab, currTab._tPos+1);
	}

	//replicate broken focus-new-tab functionality
	if (!gTabControl.getPref('bool', 'browser.tabs.loadInBackground')) {
		gTabControl.selectTab(newTab);
	}

	//tab width
	newTab.minWidth=gTabControl.getPref('int', 'tabcontrol.tabMinWidth');
	newTab.maxWidth=gTabControl.getPref('int', 'tabcontrol.tabMaxWidth');

	return newTab;
},

removeTab:function(aTab) {
	var tabToSelect=null;
	var focusLeft=gTabControl.getPref('bool', 'tabcontrol.focusLeftOnClose');

	//if we're configured to, get set to focus left tab
	if (focusLeft && aTab._tPos>0 &&
		gBrowser.mCurrentTab==aTab
	) {
		tabToSelect=gBrowser.mTabContainer.childNodes[aTab._tPos-1];
	}

	//call the browser's real remove tab function
	gBrowser.origRemoveTab(aTab);

	//skip the rest if we don't need to focus a custom tab
	if (null==tabToSelect) return;

	//set focus to the tab that we want
	gTabControl.selectTab(tabToSelect);
},

selectTab:function(aTab) {
	with (gBrowser) {
		selectedTab=aTab;
		mTabBox.selectedPanel=getBrowserForTab(mCurrentTab).parentNode;
		updateCurrentBrowser();
	}
},

duplicateTab:function() {
	var tabbrowser=document.getElementById('content');
	var tab=tabbrowser.mContextTab;

	var originalHistory=gBrowser.getBrowserForTab(tab)
		.webNavigation.sessionHistory;

	var newTab=gBrowser.addTab();
	var newHistory=gBrowser.getBrowserForTab(newTab)
		.webNavigation.sessionHistory;
	newHistory.QueryInterface(Components.interfaces.nsISHistoryInternal);

	if (newHistory.count>0) newHistory.PurgeHistory(newHistory.count);

	for (var i=0; i<originalHistory.count; i++) {
		newHistory.addEntry(originalHistory.getEntryAtIndex(i, false), true);
	}
	gBrowser.getBrowserForTab(newTab)
		.webNavigation.gotoIndex(originalHistory.index);
},

/******************************** PREFERENCES ********************************/

prefDefaults:{
	'tabcontrol.focusLeftOnClose': true,
	'tabcontrol.posRightOnAdd': true,
	'tabcontrol.tabMinWidth': 30,
	'tabcontrol.tabMaxWidth': 350,
},

getPref:function(aType, aName) {
	try {
		switch(aType) {
		case 'bool':   return this.prefObj.getBoolPref(aName);
		case 'int':    return this.prefObj.getIntPref(aName);
		case 'string':
		default:       return this.prefObj.getCharPref(aName);
		}
	} catch (e) {
		return gTabControl.prefDefaults[aName];
	}
	return '';
},

setPref:function(aType, aName, aValue) {
	try {
		switch (aType) {
		case 'bool':   this.prefObj.setBoolPref(aName, aValue); break;
		case 'int':    this.prefObj.setIntPref(aName, aValue); break;
		case 'string':
		default:       this.prefObj.setCharPref(aName, aValue); break;
		}
	} catch (e) {  }
},

loadOptions:function() {
	//checkboxes
	var checks=window.document.getElementsByTagName('checkbox');
	for (var i=0; checks[i]; i++) {
		try {
			checks[i].checked=gTabControl.getPref('bool', checks[i].getAttribute('prefstring'));
		} catch (e) {  }
	}

	//dropdowns
	var drops=window.document.getElementsByTagName('menulist');
	for (var i=0; drops[i]; i++) {
		try {
			drops[i].selectedItem=drops[i].getElementsByAttribute(
				'value',
				gTabControl.getPref('int', drops[i].getAttribute('prefstring'))
			)[0];
		} catch (e) {  }
	}

	//textboxes
	var texts=window.document.getElementsByTagName('textbox');
	for (var i=0; texts[i]; i++) {
		try {
			texts[i].value=gTabControl.getPref(
				texts[i].getAttribute('preftype'),
				texts[i].getAttribute('prefstring')
			);
		} catch (e) { alert(e) }
	}

	return true;
},

saveOptions:function() {
	//checkboxes
	var checks=window.document.getElementsByTagName('checkbox');
	for (var i=0; checks[i]; i++) {
		try {
			gTabControl.setPref(
				'bool',
				'tabcontrol.'+checks[i].getAttribute('id'),
				checks[i].checked
			);
		} catch (e) {  }
	}

	//dropdowns
	var drops=window.document.getElementsByTagName('menulist');
	for (var i=0; drops[i]; i++) {
		try {
			gTabControl.setPref(
				'int',
				drops[i].getAttribute('prefstring'),
				drops[i].selectedItem.value
			);
		} catch (e) {  }
	}

	//textboxes
	var texts=window.document.getElementsByTagName('textbox');
	for (var i=0; texts[i]; i++) {
		try {
			gTabControl.setPref(
				texts[i].getAttribute('preftype'),
				texts[i].getAttribute('prefstring'),
				texts[i].value
			);
		} catch (e) {  }
	}

	return true;
},

/********************************* DEBUGGING *********************************/

dumpErr:function(e) {
	var s='Error in tabcontrol:  ';
	s+='Line: '+e.lineNumber+'  ';
	s+=e.name+': '+e.message+'\n';
	dump(s);
},

}//close object gTabControl

//add listener for onload handler
window.addEventListener('load', gTabControl.onLoad, false);
