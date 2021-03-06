'use strict';

const VK = (function() {
	const vkCLientId = 5183677;
	const vkRequestedScopes = 'messages';
	const vkAuthenticationUrl  = 'https://oauth.vk.com/authorize?client_id=' + vkCLientId + '&scope=' + vkRequestedScopes + '&redirect_uri=http%3A%2F%2Foauth.vk.com%2Fblank.html&display=page&response_type=token';
	const vk_api = 'https://api.vk.com/method/';

	function displayAnError(textToShow, errorToShow) {
		alert(textToShow + '\n' + errorToShow);
	}

	function getUrlParameterValue(url, parameterName) {
		var urlParameters  = url.substr(url.indexOf('#') + 1),
			parameterValue = '',
			index,
			temp;

		urlParameters = urlParameters.split('&');

		for (index = 0; index < urlParameters.length; index += 1) {
			temp = urlParameters[index].split('=');

			if (temp[0] === parameterName) {
				return temp[1];
			}
		}

		return parameterValue;
	}

	function listenerHandler(authenticationTabId, tokenCallback) {
		return function tabUpdateListener(tabId, changeInfo) {
			var vkAccessToken;

			if (tabId === authenticationTabId && changeInfo.url !== undefined && changeInfo.status === 'loading') {
				if (changeInfo.url.indexOf('oauth.vk.com/blank.html') > -1) {
					authenticationTabId = null;
					chrome.tabs.onUpdated.removeListener(tabUpdateListener);
					chrome.tabs.remove(tabId);

					vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');

					if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
						displayAnError('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
						return;
					}

					chrome.storage.sync.set({'vkaccess_token': vkAccessToken}, function () {
						tokenCallback(vkAccessToken);
					});
				}
			}
		};
	}

	function checkAuth(tokenCallback, selected) {
		chrome.storage.sync.get({'vkaccess_token': {}}, function(items) {
			if (items.vkaccess_token.length === undefined) {
				chrome.tabs.create({url: vkAuthenticationUrl, selected: selected ? true : false}, function (tab) {
					chrome.tabs.onUpdated.addListener(listenerHandler(tab.id, tokenCallback));
				});
			} else {
				tokenCallback(items.vkaccess_token);
			}
		});
	}

	function getXhrHandler(xhr, selfFunction, callback) {
		return function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				var resp = JSON.parse(xhr.responseText);
				if (resp && resp.error && resp.error.error_code === 5) {
					chrome.storage.sync.remove('vkaccess_token', checkAuth(function(token) {
						setTimeout(function() {
							selfFunction(token);
						}, 334);
					}));
				} else if (resp && resp.error && resp.error.error_code === 6) {
					setTimeout(function() {
						selfFunction();
					}, 334);
				} else {
					callback && callback(resp);
				}
			}
		};
	}

	function tokenCurrying(func, args) {
		return function(token) {
			if (token !== undefined) {
				args[0] = token;
			}
			func.apply(this, args);
		};
	}

	function getUser(token, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = getXhrHandler(xhr, tokenCurrying(getUser, arguments), callback);
		xhr.open('GET', vk_api + 'users.get?fields=photo_200&v=5.41&access_token=' + token, true);
		xhr.send();
	}

	function getDialogs(token, offset, count, start_message_id, callback) {
		if (start_message_id) {
			offset = -offset;
		}
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = getXhrHandler(xhr, tokenCurrying(getDialogs, arguments), function(resp) {
			var items = resp && resp.response && resp.response.items;
			var total = resp && resp.response && resp.response.count;
			var real_offset = resp && resp.response && resp.response.real_offset;
			callback && callback(total, items, real_offset);
		});
		xhr.open('GET', vk_api + 'messages.getDialogs?offset=' + offset + '&count=' + count + (start_message_id ? '&start_message_id=' + start_message_id : '') + '&v=5.41&access_token=' + token, true);
		xhr.send();
	}

	function getDialogId(dialog) {
		var message = dialog && dialog.message;
		var dialogId;
		if (message) {
			dialogId = message.user_id;
			if (message.chat_id) {
				dialogId = message.chat_id + 2000000000;
			}
		}
		return dialogId;
	}

	function getDialogMeta(dialog) {
		const message = dialog && dialog.message;
		var meta = {};
		if (message) {
			meta.id = message.user_id;
			if (message.chat_id) {
				meta.id = message.chat_id + 2000000000;
			}
			meta.date = message.date;
			meta.title = message.title;
			meta.body = message.body;
			meta.photo = message.photo_50;
			meta.user_id = message.user_id;
		}
		return meta;
	}

	function getDialog(token, id, offset, count, callback, start_message_id) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = getXhrHandler(xhr, tokenCurrying(getDialog, arguments), function(resp) {
			var items = resp && resp.response && resp.response.items;
			if (items && items.length && start_message_id) {
				items = items.reverse();
			}
			callback && callback(items);
		});
		xhr.open('GET', vk_api + 'messages.getHistory?' + (start_message_id === undefined ? 'rev=1' : '') + (id > 2000000000 ? '&peer_id=' + id : ('&user_id=' + id)) + (start_message_id ? '&start_message_id=' + start_message_id : '') + '&offset=' + ((start_message_id ? -1 : 1) * offset) + '&count=' + count + '&v=5.41&access_token=' + token, true);
		xhr.send();
	}

	function getAvatars(ids, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = getXhrHandler(xhr, tokenCurrying(getAvatars, arguments), function(resp) {
			var peoples = resp && resp.response;
			callback && callback(peoples);
		});
		xhr.open('GET', vk_api + 'users.get?user_ids=' + ids.join() + '&fields=photo_50&v=5.41', true);
		xhr.send();
	}

	return class VK {
		static checkAuth(tokenCallback) { checkAuth(tokenCallback); }
		static getUser(token, callback) { getUser(token, callback); }
		static getDialogs(token, offset, count, start_message_id, callback) { getDialogs(token, offset, count, start_message_id, callback); }
		static getDialogId(dialog) { return getDialogId(dialog); }
		static getDialogMeta(dialog) { return getDialogMeta(dialog); }
		static getDialog(token, id, offset, count, start_message_id, callback) { getDialog(token, id, offset, count, callback, start_message_id); }
		static getAvatars(ids, callback) { getAvatars(ids, callback); }
		static get MAX_DIALOGS_ON_PAGE() { return 200; }
	};
})();

export default VK;
