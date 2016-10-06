var rpcookie =
{
  /*
   *  prefix    cookie name prefix
   *  pages     internal list of all opened pages
   *  interval  interval to poll everything
   *  callbacks callback pointers to open and close functions
   *  timer_ix  index of timer returned by setInterval
   *  loaded    set after calling the load done callback
   *  runs      number of times the work loop was called (resets at 6)
   *  my_name   will store my randomly generated cookie name
   */

  /* ================================= STATE ================================ */
  init: function(params)
  {
    if (rpcookie.timer_ix)
      return true;
    if (typeof document.cookie != 'string' || !navigator.cookieEnabled)
      return false;

    rpcookie.prefix = 'rpc_';
    rpcookie.pages = {};
    rpcookie.interval = 300;
    rpcookie.loaded = false;
    rpcookie.runs = 0;

    rpcookie.callbacks = { new: rpcookie.internal_new,
                           close: rpcookie.internal_close,
                           load: rpcookie.internal_load };

    rpcookie.config(params);

    window.addEventListener('unload', rpcookie.unload_event);
    if (!rpcookie.register_me(true))
      return false;

    rpcookie.timer_ix = setInterval(rpcookie.timer_func, rpcookie.interval);
    if (!rpcookie.timer_ix) /* insanity check */
      rpcookie.del_cookie(rpcookie.my_name);

    return !!rpcookie.timer_ix;
  },
  
  config: function(params)
  {
    if (typeof params != 'object')
      return false;

    if (typeof params.prefix == 'string')
      rpcookie.prefix = params.prefix;
    if (typeof params.interval == 'number')
      rpcookie.interval = params.interval;

    if (typeof params.new_page == 'function')
      rpcookie.callbacks.new = params.new_page;
    if (typeof params.close_page == 'function')
      rpcookie.callbacks.close = params.close_page;
    if (typeof params.load_done == 'function')
      rpcookie.callbacks.load = params.load_done;

    return true;
  },

  register_me: function(rename)
  {
    if (rename)
      rpcookie.my_name = rpcookie.prefix+rpcookie.random();
    if (!rpcookie.add_cookie(rpcookie.my_name, '%'))
      return false;

    var page = rpcookie.register_page(rpcookie.my_name);
    page.is_new = false; /* do not callback for ourself */

    rpcookie.update_me();
    return true;
  },

  stop: function()
  {
    if (rpcookie.timer_ix)
    {
      clearInterval(rpcookie.timer_ix);
      rpcookie.timer_ix = false;
      rpcookie.del_cookie(rpcookie.my_name);
    }
    return true;
  },

  internal_load: function()
  {
    console.log('load  ok');
  },

  internal_new: function(page)
  {
    console.log('opened:', page.url);
  },

  internal_close: function(page)
  {
    console.log('closed:', page.url);
  },
  /* ======================================================================== */

  /* ================================ PUBLIC ================================ */
  list_pages: function()
  {
    var i, keys, ret;

    for (i = 0, keys = Object.keys(rpcookie.pages), ret = []; i < keys.length; i++)
      ret.push(rpcookie.make_data(keys[i]));

    return ret;
  },
  /* ======================================================================== */

  /* ================================ WORKER ================================ */
  make_data: function(name)
  {
    return { 'url': rpcookie.pages[name].url,
             'id': name.substring(rpcookie.prefix.length) }
  },

  timer_func: function(me)
  {
    var cookies = rpcookie.parse_cookies(), keys, i, checked, page;

    for (i = 0, keys = Object.keys(cookies), checked = []; i < keys.length; i++)
    {
      /* add and update every page reading the cookie data */
      if (typeof rpcookie.pages[keys[i]] == 'undefined')
        page = rpcookie.register_page(keys[i]);
      else
        page = rpcookie.pages[keys[i]];

      page.val = cookies[keys[i]];
      rpcookie.parse_page(keys[i]);

      /* when the page is inactive the browser will fire the event only everu 1000ms,
       * so wait a least 2 cycles before killing the page */
      if (page.bad_runs > 2500 / rpcookie.interval)
        rpcookie.del_cookie(keys[i]);
      else
        checked.push(keys[i]);
    }

    for (i = 0, keys = Object.keys(rpcookie.pages); i < keys.length; i++)
    {
      page = rpcookie.pages[keys[i]];
      /* callback dead pages */
      if (keys[i] != rpcookie.my_name && rpcookie.in_array(keys[i], checked) < 0)
      {
        delete rpcookie.pages[keys[i]];
        rpcookie.callbacks.close(page);
      }
      /* callback new pages */
      else if (page.is_new)
      {
        page.is_new = false;
        if (rpcookie.loaded) /* already existing pages are not callback'ed */
          rpcookie.callbacks.new(rpcookie.make_data(keys[i]));
      }
    }

    rpcookie.runs++;
    rpcookie.runs &= 7;
    rpcookie.update_me();

    if (!rpcookie.loaded)
    {
      rpcookie.callbacks.load();
      rpcookie.loaded = true;
    }
  },

  update_me: function()
  {
    var page = rpcookie.pages[rpcookie.my_name], str;
    page.url = location.href;
    str = '@$' +
          'R' + rpcookie.runs + '$' +
          'U' + page.url + '$';
    page.val = str;
    rpcookie.add_cookie(rpcookie.my_name, page.val);
  },

  parse_page: function(name)
  {
    var page = rpcookie.pages[name], data, runs, url;

    data = page.val.split('$', 3);
    if (data.length != 3 || data[0] != '@')
      return false;
    runs = parseInt(data[1][1]);
    if (runs == page.runs)
      page.bad_runs++;
    else
      page.bad_runs = 0;
    page.runs = runs;
    
    url = data[2].substring(1);
    if (page.url != url)
      page.is_new = true;
    page.url = url;
  },

  register_page: function(name)
  {
    rpcookie.pages[name] = { is_new: true, url: '', runs: 0, bad_runs: 0 };
    return rpcookie.pages[name];
  },
  /* ======================================================================== */

  /* ============================ DOCUMENT COOKIE =========================== */
  parse_cookies: function()
  {
    var cookies = {}, s, i, p, plen = rpcookie.prefix.length;
    if (typeof document.cookie == 'string')
    {
      s = document.cookie.split(';');
      for (i = 0; i < s.length; i++)
      {
        p = s[i].split('=');
        if (p.length == 2 && (p[0] = rpcookie.trim(p[0])) && 
            p[0].substring(0,plen) == rpcookie.prefix)
          cookies[p[0]] = p[1];
      }
    }

    /* check if somebody has cleaned the cookies */
    if (typeof cookies[rpcookie.my_name] == 'undefined')
    {
      if (!rpcookie.register_me(false))
      {
        /* browser is blocking our cookies, we can no longer recover */
        cookies = {};
        rpcookie.stop();
      }
    }
    delete cookies[rpcookie.my_name];
    
    return cookies;
  },

  add_cookie: function(name, value)
  {
    document.cookie = name + '=' + value;
    return document.cookie.indexOf(name) >= 0;
  },

  del_cookie: function(name)
  {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
  },
  /* ======================================================================== */

  /* ================================ HELPERS =============================== */
  unload_event: function()
  {
    rpcookie.stop();
  },
  
  page_visible: function()
  {
    return !(document.hidden || document.webkitHidden || document.mozHidden || document.msHidden);
  },

  in_array: function(what, where)
  {
    var i;
    for (i = 0; i < where.length; i++)
      if (what == where[i])
        return i;
    return -1;
  },

  trim: function(str) /* str.trim is too new on IE */
  {
    return str.replace(/^\s+|\s+$/gm,'');
  },

  random: function()
  {
    return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
  }
  /* ======================================================================== */
};
