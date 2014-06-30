;(function() {

	document.onselectstart=function() {
		if(dragging || resizing) {
			return false;
		}
	}

	document.onmousedown=function(e) {
		if(dragging || resizing) {
			if(e) e.preventDefault();
		}
	}

	var pX, pY, tempX, tempY, startX, startY, startLeft, startTop, what_dragging, zIndex = 1,
		resizing_dir, what_resizing, startWidth, startHeight, resizing = false,
		dragging = false, cursor_resizing = false,
		tTabs = new Array(),
		tWindows = new Array(),
		tWindowsState = new Array(), // whether window is minimized or not
		current_id = 0; // used for id parameter in createWindow()
		taskbar = document.getElementById('taskbar'),
		context_menu = document.getElementById('menu_podr');
		active = new Array(); // tabs activation order - 0-indexed tab is currently active

	// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

	function init_icon(obj, title, url) {
		init_icon_dragging(obj);
		add_icon_func(obj, title, url);
	}

	function new_ajax() {
		return new XMLHttpRequest();
	}

	function add_icon_func(obj, title, url) {
		obj.ondblclick = function() {
			var w = createWindow(title);
			w.innerHTML = 'Ładowanie zawarości...';
			ajax = new_ajax();
			ajax.open('GET', url);
			ajax.onreadystatechange = function() {
				if(ajax.readyState==4 && ajax.status==200) {
					w.innerHTML = ajax.responseText;
				}/* else {
					w.innerHTML='An error occured: HTTP ' + ajax.status;
				}*/
			}
			ajax.send(null);
		}
	}

	document.onclick = function(e) {
		var e = e || window.event;
		var target = e.target != null ? e.target : e.srcElement;
		if(e.button==0 || e.button==1) {
			context_menu.style.visibility='hidden';
		} else if(e.button==2 || e.button==3) {
			if(target===document.getElementsByTagName('body')[0]) {
				context_menu.style.zIndex=++zIndex;
				context_menu.style.top=pY + 'px';
				context_menu.style.left=pX + 'px';
				context_menu.style.visibility='visible';
			}
			return false;
		}
	}
	document.ondblclick = function() {
		return false;
	}

	function init_icon_dragging(ico_obj) {
		try {
			ico_obj.style.top = localStorage[ico_obj.id + '_top'];
			ico_obj.style.left = localStorage[ico_obj.id + '_left'];
		} catch(e) {}
		init_dragging(ico_obj, ico_obj);
		var oldMU = ico_obj.onmousedown;
		ico_obj.onmouseup = function(e) {
			if(typeof(oldMD)=='function') oldMU();
			localStorage[ico_obj.id + '_top']=ico_obj.style.top;
			localStorage[ico_obj.id + '_left']=ico_obj.style.left;
		}
	}

	function activate(zakladka) {
		var new_active = new Array();
		new_active.push(zakladka);
		for(var z in active) {
			if(zakladka !== active[z]) {
				new_active.push(active[z]);
			}
		}
		active = new_active;
	}

	function onTop(obj) {
		obj.style.zIndex = ++zIndex;
		if(active[0]) {
			active[0].style.fontWeight = 'normal';
			tWindows[active[0].id].className = 'okno w-tle';
		}
		obj.className = 'okno';
		tTabs[obj.id].style.fontWeight = 'bold';
		tTabs[obj.id].className = 'zakladka active-tab';
		activate(tTabs[obj.id]);
	}

	function toggleMinimize(tab, button) {
		if(tWindowsState[tab.id] == 0) {
			tab.style.fontWeight = 'bold';
			tab.className = 'zakladka active-tab';
			tWindows[tab.id].style.visibility = 'visible';
			onTop(tWindows[tab.id]);
			tWindowsState[tab.id] = 1;
			if(active[1]) active[1].style.fontWeight = 'normal';
		} else if(tWindows[tab.id].style.zIndex != zIndex && !button) {
			onTop(tWindows[tab.id]);
			if(active[1]) {
				active[1].style.fontWeight = 'normal';
			}
			tab.style.fontWeight = 'bold';
		} else if(tWindowsState[tab.id] == 1) {
			tab.style.fontWeight = 'normal';
			tab.className = 'zakladka non-active-tab';
			tWindows[tab.id].style.visibility = 'hidden';
			tWindowsState[tab.id] = 0;
			for(var i = 1; i < active.length; ++i) {
				if(tWindowsState[active[i].id] == 1) {
					active[i].style.fontWeight = 'bold';
					tWindows[active[i].id].style.zIndex = ++zIndex;
					activate(active[i]);
					return; // omit the activate() at the bottom of the function
				}
			}
		}
		activate(tab);
	}

	function createWindow(title, left, top, width, height) {
		var okno = document.createElement('div');
		var header = document.createElement('div');
		var zawartosc = document.createElement('div');
		var mini = document.createElement('div');
		var close = document.createElement('div');
		var zakladka = document.createElement('div');

		++current_id;
		var zId='z' + current_id;
		var wId='w' + current_id;

		zakladka.id=zId;
		zakladka.onmouseup=function() {
			toggleMinimize(this);
		}
		zakladka.innerHTML=title;
		zakladka.style.fontWeight='bold';
		zakladka.className='zakladka active-tab';
		tTabs[wId]=zakladka;
		taskbar.appendChild(zakladka);

		tWindows[zId]=okno;
		okno.className='okno';
		okno.id=wId;

		tWindowsState[zId]=1;

		header.className='header';
		header.innerHTML=title;

		zawartosc.className='tlo';

		mini.className='mini';
		mini.innerHTML='_';
		mini.onmouseup=function() {
			toggleMinimize(tTabs[wId], true);
		}

		close.className='close';
		close.innerHTML='X';
		close.onmouseup=function() {
			closeWindow(okno);
		}

		okno.appendChild(header);
		okno.appendChild(zawartosc);
		okno.appendChild(mini);
		okno.appendChild(close);
		onTop(okno);
		var oldMD=okno.onmousedown;
		okno.onmousedown=function() {
			if(typeof(oldMD)=='function') oldMD();
			onTop(okno);
		}

		if(!width) width=600;
		if(!height) height=500;
		okno.style.width=width + 'px';
		okno.style.height=height + 'px';

		if(!left){
			var scr_width=(document.body.clientWidth||window.innerWidth);
			left=(scr_width-width)/2
		}

		if(!top) {
			var scr_height=(document.body.clientHeight||window.innerHeight);
			top=(scr_height-height)/2-30
		}

		init_dragging(okno, header, left, top);
		init_resizing(okno);
		document.body.appendChild(okno);

		return zawartosc;
	}

	function closeWindow(w) {
		taskbar.removeChild(tTabs[w.id]);
		document.body.removeChild(w);
		var new_active=new Array();
		for(var z in active) {
			if(tTabs[w.id]!=active[z]) new_active.push(active[z]); // kasujemy informację o aktywności okna
		}
		active=new_active;
		for(var i in active) { // poprzednio otwarte okno (niezminimalizowane) staje się aktywne
			if(tWindowsState[active[i].id]==1) {
				active[i].style.fontWeight='bold';
				tWindows[active[i].id].style.zIndex=++zIndex;
				tWindows[active[i].id].className='okno';
				activate(active[i]);
			}
		}
		delete tWindows[tTabs[w.id].id];
		delete tTabs[w.id];
	}

	document.onmousemove = function (e) {

			if(e) {
				pX=e.pageX;
				pY=e.pageY;
			} else {
				pY=event.clientY+document.body.scrollTop;
				pX=event.clientX+document.body.scrollLeft;
			}

			if(dragging) {
				what_dragging.style.left = startX + pX - tempX + 'px';
				what_dragging.style.top = startY + pY - tempY + 'px';
			}

			if(resizing) {

				switch(resizing_dir) {

					case 'right':
										what_resizing.style.cursor='e-resize';
										if(startWidth + pX - tempX >= 200) what_resizing.style.width = startWidth + pX - tempX + 'px'; else what_resizing.style.width='200px';
										break;


					case 'bottom':
										what_resizing.style.cursor='s-resize';
										if(startHeight + pY - tempY >= 200) what_resizing.style.height = startHeight + pY - tempY + 'px'; else what_resizing.style.height='200px';
										break;


					case 'left':
										what_resizing.style.cursor='w-resize';
										if(startWidth - pX + tempX >= 200) {
											what_resizing.style.width = startWidth - pX + tempX + 'px';
											what_resizing.style.left = startLeft + pX - tempX + 'px';
										} else {
											what_resizing.style.width='200px';
										}
										break;


					case 'top':
										what_resizing.style.cursor='n-resize';
										if(startHeight - pY + tempY >= 200) {
											what_resizing.style.height = startHeight - pY + tempY + 'px';
											what_resizing.style.top = startTop + pY - tempY + 'px';
										} else {
											what_resizing.style.height='200px';
										}
										break;

					case 'right-bottom':
										what_resizing.style.cursor='se-resize';
										if(startWidth + pX - tempX >= 200) what_resizing.style.width = startWidth + pX - tempX + 'px'; else what_resizing.style.width='200px';
										if(startHeight + pY - tempY >= 200) what_resizing.style.height = startHeight + pY - tempY + 'px'; else what_resizing.style.height='200px';
										break;


					case 'left-bottom':
										what_resizing.style.cursor='sw-resize';
										if(startHeight + pY - tempY >= 200) what_resizing.style.height = startHeight + pY - tempY + 'px'; else what_resizing.style.height='200px';
										if(startWidth - pX + tempX >= 200) {
											what_resizing.style.width = startWidth - pX + tempX + 'px';
											what_resizing.style.left = startLeft + pX - tempX + 'px';
										} else {
											what_resizing.style.width='200px';
										}
										break;


					case 'left-top':
										what_resizing.style.cursor='nw-resize';
										if(startWidth - pX + tempX >= 200) {
											what_resizing.style.width = startWidth - pX + tempX + 'px';
											what_resizing.style.left = startLeft + pX - tempX + 'px';
										} else {
											what_resizing.style.width='200px';
										}
										if(startHeight - pY + tempY >= 200) {
											what_resizing.style.height = startHeight - pY + tempY + 'px';
											what_resizing.style.top = startTop + pY - tempY + 'px';
										} else {
											what_resizing.style.height='200px';
										}
										break;

					case 'right-top':
										what_resizing.style.cursor='ne-resize';
										if(startWidth + pX - tempX >= 200) what_resizing.style.width = startWidth + pX - tempX + 'px'; else what_resizing.style.width='200px';
										if(startHeight - pY + tempY >= 200) {
											what_resizing.style.height = startHeight - pY + tempY + 'px';
											what_resizing.style.top = startTop + pY - tempY + 'px';
										} else {
											what_resizing.style.height='200px';
										}
										break;

				}

			}
	}




	function init_dragging(obj, header, posX, posY) {

		if(posX) {
			obj.style.left=posX + 'px';
		}
		else if(obj.currentStyle) {
			// IE, Opera
			obj.style.left=obj.currentStyle['left'];
		}
		else if(document.defaultView && document.defaultView.getComputedStyle) {
			// Gecko,Webkit
			obj.style.left=document.defaultView.getComputedStyle(obj, '')['left'] || {};
		}
		else {
			obj.style.left= '0px';
		}

		if(posY) {
			obj.style.top=posY + 'px';
		}
		else if(obj.currentStyle) {
			// IE, Opera
			obj.style.top=obj.currentStyle['top'];
		}
		else if(document.defaultView && document.defaultView.getComputedStyle) {
			// Gecko, Webkit
			obj.style.top=document.defaultView.getComputedStyle(obj, '')['top'] || {};
		}
		else {
			obj.style.top= '0px';
		}

		var oldMD=obj.onmousedown;
		header.onmousedown=function(e) {
			var e = e || window.event;
			if(typeof(oldMD)=='function') oldMD(e);
			if(!cursor_resizing && (e.button==0 || e.button==1)) {
				startX=parseInt(obj.style.left);
				startY=parseInt(obj.style.top)
				tempX=pX;
				tempY=pY;
				what_dragging=obj;
				dragging=true;
			}
		}

	}

	function init_resizing(obj) {

		var oldMD=obj.onmousedown;
		obj.onmousedown=function(e) {
			var e = e || window.event;
			if(typeof(oldMD)=='function') oldMD();
			if(cursor_resizing && (e.button==0 || e.button==1)) {
				startWidth = parseInt(obj.scrollWidth);
				startHeight = parseInt(obj.scrollHeight);
				startLeft=parseInt(obj.style.left);
				startTop=parseInt(obj.style.top);
				tempX=pX;
				tempY=pY;
				what_resizing=obj;
				resizing=true;
			}
		}

		var oldMM=obj.onmousemove;

		obj.onmousemove=function() {
			if(typeof(oldMM)=='function') oldMM();

			var width, height, top, left;
			width=parseInt(obj.scrollWidth);
			height=parseInt(obj.scrollHeight);
			top=parseInt(obj.style.top);
			left=parseInt(obj.style.left);

			if(pY>(top+height-3) && pX>(left+width-3)) { // dół i prawo
				if(!resizing) {
					obj.style.cursor='se-resize';
					resizing_dir='right-bottom';
				}
				cursor_resizing=true;
			}
			else if(pY>(top+height-3) && pX<(left+3)) { // dół i lewo
				if(!resizing) {
					obj.style.cursor='sw-resize';
					resizing_dir='left-bottom';
				}
				cursor_resizing=true;
			}
			else if(pY<(top+3) && pX<(left+3)) { // góra i lewo
				if(!resizing) {
					obj.style.cursor='nw-resize';
					resizing_dir='left-top';
				}
				cursor_resizing=true;
			}
			else if(pY<(top+3) && pX>(left+width-3)) { // góra i prawo
				if(!resizing) {
					obj.style.cursor='ne-resize';
					resizing_dir='right-top';
				}
				cursor_resizing=true;
			}
			else if(pX>(left+width-3)) { // prawa
				if(!resizing) {
					obj.style.cursor='e-resize';
					resizing_dir='right';
				}
				cursor_resizing=true;
			}
			else if(pX<(left+3)) { // lewa
				if(!resizing) {
					obj.style.cursor='w-resize';
					resizing_dir='left';
				}
				cursor_resizing=true;
			}
			else if(pY<(top+3)) { // góra
				if(!resizing) {
					obj.style.cursor='n-resize';
					resizing_dir='top';
				}
				cursor_resizing=true;
			}
			else if(pY>(top+height-3)) { // dół
				if(!resizing) {
					obj.style.cursor='s-resize';
					resizing_dir='bottom';
				}
				cursor_resizing=true;
			}
			else {
				obj.style.cursor='auto';
				cursor_resizing=false;
			}
		}
	}

	document.onmouseup=function() {
		dragging=false;
		resizing=false;
	}

	// Let's go:

	var elems=document.getElementsByTagName('a');

	for(var a in elems) {
		if(elems[a].className=='ikona') {
			init_icon(elems[a], elems[a].title, elems[a].href + '&ajax');
			elems[a].onclick=function() { return false; }
			elems[a].title='';
		}
	}

})();