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

	var searchbar=document.getElementById('searchbar');
	gTabControl.origHandleSearchCommand=searchbar.handleSearchCommand;
	searchbar.handleSearchCommand=gTabControl.handleSearchCommand;
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
	//call the browser's real add tab function
	var newTab;
	if (2==arguments.length
		&& 'object'==typeof arguments[1]
		&& !(arguments[1] instanceof Ci.nsIURI)
	) {
		newTab=gBrowser.origAddTab(aURI, aReferrerURI);
	} else {
		newTab=gBrowser.origAddTab(
			aURI, aReferrerURI, aCharset, aPostData, aOwner, aAllowThirdPartyFixup
		);
	}

	//#294: stop processing if there is no URI.
	if ('undefined'==typeof aURI) return newTab;

	//shift the new tab into position
	if (gTabControl.getPref('bool', 'tabcontrol.posRightOnAdd')) {
		var afterTab=gBrowser.mCurrentTab.nextSibling;

		if (gTabControl.getPref('bool', 'tabcontrol.leftRightGroup')) {
			if (!gBrowser.mCurrentTab.hasAttribute('tabControlId')) {
				gBrowser.mCurrentTab.setAttribute(
					'tabControlId',
					String(Math.random()).substr(2)
				);
			}

			var tabId=gBrowser.mCurrentTab.getAttribute('tabControlId');
			newTab.setAttribute('tabControlRefId', tabId);

			while (
				afterTab.getAttribute('tabControlRefId')==tabId
				&& afterTab.nextSibling
			) {
				afterTab=afterTab.nextSibling;
			}
		}

		gBrowser.moveTabTo(newTab, afterTab._tPos);

		//compatibility fix with CoLoUnREaDTabs (#152)
		newTab.removeAttribute('selected');
	}

	return newTab;
},

removeTab:function(aTab) {
	var focusTab = null;

	//if we're configured to, get ready to focus left tab
	if (gTabControl.getPref('bool', 'tabcontrol.focusLeftOnClose')
		&& aTab._tPos>0
		&& gBrowser.mCurrentTab==aTab
	) {
		focusTab = gBrowser.mTabContainer.childNodes[aTab._tPos-1];
	}

	//call the browser's real remove tab function
	gBrowser.origRemoveTab(aTab);

	if (focusTab) {
		//set focus to the tab that we want
		gTabControl.selectTab(focusTab);
	}
},

selectTab:function(aTab) {
	with (gBrowser) {
		selectedTab=aTab;
		mTabBox.selectedPanel=getBrowserForTab(mCurrentTab).parentNode;
		updateCurrentBrowser();
	}
},

handleSearchCommand:function(aEvent) {
	var searchbar=document.getElementById('searchbar');

	if ('keypress'==aEvent.type
		&& 13==aEvent.which
		&& aEvent.ctrlKey
	) {
		//specifically open search in new tab
		searchbar.doSearch(searchbar._textbox.value, 'tab');
	} else {
		//call original function to handle things as it will
		gTabControl.origHandleSearchCommand.apply(searchbar, [aEvent]);
	}
},

/******************************** PREFERENCES ********************************/

getPref:function(aType, aName) {
	try {
		switch(aType) {
		case 'bool':   return this.prefObj.getBoolPref(aName);
		case 'int':    return this.prefObj.getIntPref(aName);
		case 'string':
		default:       return this.prefObj.getCharPref(aName);
		}
	} catch (e) { }
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
		} catch (e) { alert(e); }
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
				checks[i].getAttribute('prefstring'),
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
}

};

//add listener for onload handler
window.addEventListener('load', gTabControl.onLoad, false);
