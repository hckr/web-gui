;(function() {

	var globalConfig = {
		desktop: {
			boundaries: (function() {
				var _top = 0,
					_left = 0,
					_right,
					_bottom;
				document.addEventListener('resize', function() {
					_right = document.body.clientWidth;
					_bottom = document.body.clientHeight;
				}, false);
				return {
					top: _top,
					left: _left,
					right: _right,
					bottom: _bottom
				}
			}),
			size: (function() {
				var _width,
					_height;
				document.addEventListener('resize', function() {
					_width = document.body.clientWidth;
					_height = document.body.clientHeight;
				}, false);
				return {
					width: _width,
					height: _height
				}
			})
		},
		defaultWindow: (function() {
			var defaultWidth = 600,
				defaultHeight = 500,
				minInitTop = 10,
				minInitLeft = 10,
				defaultTitle = '';
			return {
				title: function() {
					return defaultTitle;
				},
				width: function() {
					return defaultWidth;
				},
				height: function() {
					return defaultHeight;
				},
				top: function(height) {
					height = height || defaultHeight;
					var top = document.body.clientHeight / 2 - height / 2 - 50;
					return top >= minInitTop ? top : minInitTop;
				},
				left: function(width) {
					width = width || defaultWidth;
					var left = document.body.clientWidth / 2 - width / 2;
					return left >= minInitLeft ? left : minInitLeft;
				}
			}
		})()
	};

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
		current_id = 0; // used for id parameter in Window()
		taskbar = document.getElementById('taskbar'),
		context_menu = document.getElementById('context_menu');
		active = new Array(); // tabs activation order - 0-indexed tab is currently active

	// -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

	function init_icon(obj, title, url) {
		obj.addEventListener('click', function(e) {
			e.preventDefault();
		}, false);
		init_icon_dragging(obj);
		add_icon_func(obj, title, url);
	}

	function new_ajax() {
		return new XMLHttpRequest();
	}

	function add_icon_func(obj, title, url) {
		obj.addEventListener('dblclick', function() {
			var w = Window({
				title: title,
				width: 400,
				height: 350,
			});
			w.showContent('Loading content...');
			ajax = new_ajax();
			ajax.open('GET', url);
			ajax.onreadystatechange = function() {
				if(ajax.readyState==4 && ajax.status==200) {
					w.showContent(ajax.responseText);
				}/* else {
					w.innerHTML='An error occured: HTTP ' + ajax.status;
				}*/
			}
			ajax.send(null);
		}, false);
	}

	document.addEventListener('contextmenu', function(e) {
		e.preventDefault();
		context_menu.style.zIndex = ++zIndex;
		context_menu.style.top = pY + 'px';
		context_menu.style.left = pX + 'px';
		context_menu.className = 'show';
		setTimeout(function() {
			document.addEventListener('click', function onclick(e) {
				context_menu.className = '';
				document.removeEventListener('click', onclick, false);
			}, false);
		}, 0);
	}, false);

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
			tWindows[active[0].id].className = 'window in-background';
		}
		obj.className = 'window';
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

	function loadWindowProps(props) {
		return {
			title: props.title || globalConfig.defaultWindow.title(),
			width: props.width || globalConfig.defaultWindow.width(),
			height: props.height || globalConfig.defaultWindow.height(),
			top: props.top || globalConfig.defaultWindow.top(props.height),
			left: props.left || globalConfig.defaultWindow.left(props.width),
		}
	}

	function Window(properties) {
		props = loadWindowProps(properties);
		var frame = document.createElement('div'),
			header = document.createElement('div'),
			content = document.createElement('div'),
			mini = document.createElement('div'),
			close = document.createElement('div'),
			zakladka = document.createElement('div');

		++current_id;
		var zId='z' + current_id,
			wId='w' + current_id;

		zakladka.id=zId;
		zakladka.onmouseup=function() {
			toggleMinimize(this);
		}
		zakladka.innerHTML=props.title;
		zakladka.style.fontWeight='bold';
		zakladka.className='zakladka active-tab';
		tTabs[wId]=zakladka;
		taskbar.appendChild(zakladka);

		tWindows[zId]=frame;
		frame.className='window';
		frame.id=wId;

		tWindowsState[zId]=1;

		header.className='header';
		header.innerHTML=props.title;

		content.className='tlo';

		mini.className='mini';
		mini.innerHTML='_';
		mini.onmouseup=function() {
			toggleMinimize(tTabs[wId], true);
		}

		close.className='close';
		close.innerHTML='X';
		close.onmouseup=function() {
			closeWindow(frame);
		}

		frame.appendChild(header);
		frame.appendChild(content);
		frame.appendChild(mini);
		frame.appendChild(close);
		onTop(frame);
		frame.addEventListener('mousedown', function() {
			onTop(frame);
		}, false);

		frame.style.width = props.width + 'px';
		frame.style.height = props.height + 'px';

		init_dragging(frame, header, props.left, props.top);
		init_resizing(frame);
		document.body.appendChild(frame);

		return {
			showContent: function(c) {
				content.innerHTML = c;
			}
		};
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
				tWindows[active[i].id].className='window';
				activate(active[i]);
			}
		}
		delete tWindows[tTabs[w.id].id];
		delete tTabs[w.id];
	}

	document.addEventListener('mousemove', function(e) {

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
				if(parseInt(what_dragging.style.left) + parseInt(what_dragging.style.width) > document.body.clientWidth) {
					what_dragging.style.left = (parseInt(document.body.clientWidth) - parseInt(what_dragging.style.width)) + 'px';
				} else if(parseInt(what_dragging.style.left) < 0) {
					what_dragging.style.left = 0;
				}
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
	}, false);

	function init_dragging(obj, header, posX, posY) {

		if(posX) {
			obj.style.left=posX + 'px';
		} else if(obj.currentStyle) {
			// IE, Opera
			obj.style.left=obj.currentStyle['left'];
		} else if(document.defaultView && document.defaultView.getComputedStyle) {
			// Gecko,Webkit
			obj.style.left=document.defaultView.getComputedStyle(obj, '')['left'] || {};
		} else {
			obj.style.left= '0px';
		}

		if(posY) {
			obj.style.top=posY + 'px';
		} else if(obj.currentStyle) {
			// IE, Opera
			obj.style.top=obj.currentStyle['top'];
		} else if(document.defaultView && document.defaultView.getComputedStyle) {
			// Gecko, Webkit
			obj.style.top=document.defaultView.getComputedStyle(obj, '')['top'] || {};
		} else {
			obj.style.top= '0px';
		}

		header.addEventListener('mousedown', function(e) {
			if(!cursor_resizing && (e.button==0 || e.button==1)) {
				startX=parseInt(obj.style.left);
				startY=parseInt(obj.style.top)
				tempX=pX;
				tempY=pY;
				what_dragging=obj;
				dragging=true;
			}
		}, false);

	}

	function init_resizing(obj) {

		obj.addEventListener('mousedown', function(e) {
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
		}, false);

		obj.addEventListener('mousemove', function() {
			var width = parseInt(obj.scrollWidth),
				height = parseInt(obj.scrollHeight),
				top = parseInt(obj.style.top),
				left = parseInt(obj.style.left);

			if(pY>(top+height-3) && pX>(left+width-3)) { // dół i prawo
				if(!resizing) {
					obj.style.cursor='se-resize';
					resizing_dir='right-bottom';
				}
				cursor_resizing=true;
			} else if(pY>(top+height-3) && pX<(left+3)) { // dół i lewo
				if(!resizing) {
					obj.style.cursor='sw-resize';
					resizing_dir='left-bottom';
				}
				cursor_resizing=true;
			} else if(pY<(top+3) && pX<(left+3)) { // góra i lewo
				if(!resizing) {
					obj.style.cursor='nw-resize';
					resizing_dir='left-top';
				}
				cursor_resizing=true;
			} else if(pY<(top+3) && pX>(left+width-3)) { // góra i prawo
				if(!resizing) {
					obj.style.cursor='ne-resize';
					resizing_dir='right-top';
				}
				cursor_resizing=true;
			} else if(pX>(left+width-3)) { // prawa
				if(!resizing) {
					obj.style.cursor='e-resize';
					resizing_dir='right';
				}
				cursor_resizing=true;
			} else if(pX<(left+3)) { // lewa
				if(!resizing) {
					obj.style.cursor='w-resize';
					resizing_dir='left';
				}
				cursor_resizing=true;
			} else if(pY<(top+3)) { // góra
				if(!resizing) {
					obj.style.cursor='n-resize';
					resizing_dir='top';
				}
				cursor_resizing=true;
			} else if(pY>(top+height-3)) { // dół
				if(!resizing) {
					obj.style.cursor='s-resize';
					resizing_dir='bottom';
				}
				cursor_resizing=true;
			} else {
				obj.style.cursor='auto';
				cursor_resizing=false;
			}
		}, false);
	}

	document.addEventListener('mouseup', function() {
		dragging=false;
		resizing=false;
	}, false);

	// Let's go:

	[].slice.call(document.getElementsByClassName('icon')).forEach(function(el) {
		init_icon(el, el.title, el.href + '&ajax');
		el.title='';
	});

})();