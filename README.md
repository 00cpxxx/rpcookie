# rpcookie

rpcookie (aka remote procedure cookie) is a very simple Javascript library that helps a site to communicate between all its opened windows/tabs. It can count how many pages are opened, list their URL addresses, check which page is active, broadcast/unicast any Javascript operation from a page to others (using eval, pure evil and currently WIP). There are also callbacks for page opened and page closed.

To do so it creates a new random cookie whenever a new page is opened or a link followed, every opened page constantly checks for changes in the list to run the correct operations. Also to detect closed pages when the unload event is not fired all pages check each other and act when required to kill the zombies.

The page opened callback is triggered not only when a new window is opened but also when a link is followed so changing the current page.

Working online example (open the link a few times in different tabs/windows and notice that each other detect the events and updates the list of opened pages):
http://alexa.pro.br/~bruno/rpcookie/

Example usage:

<pre>
&lt;script src="rpcookie.js"&gt;&lt;/script&gt;
&lt;script&gt;
function Pages()
{
  var pages = rpcookie.list_pages(), i;
  for (i = 0; i < pages.length; i++)
    console.log('URL' + pages[i].url);
}
function PageChanged(data)
{
  console.log('OPENED: ' + data.url);
}

function PageClosed(data)
{
  console.log('CLOSED: ' + data.url);
}

rpcookie.init({ new_page: PageChanged,
                close_page: PageClosed,
                load_done: Pages });
&lt;/script&gt;
</pre>
