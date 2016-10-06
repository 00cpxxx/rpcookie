# rpcookie

rpcookie (aka remote procedure cookie) is a very simple Javascript library that helps a site to communicate between all its opened windows/tabs. It can count how many pages are opened, list their URL, check which page is active, broadcast/unicast any Javascript operation from a page to others (using eval, pure evil). There are also callbacks like: page opened, page closed, page got focus, page lost focus.

To do so it creates a new random cookie whenever a new page is opened or a link followed, every opened page constantly checks for changes in the list to run the correct operations. Also to detect closed pages when the unload event is not fired all pages ping each other and kill non-responsive cookies.

The page opened callback is triggered not only when a new window is opened but also when a link is followed so changing the current page.
