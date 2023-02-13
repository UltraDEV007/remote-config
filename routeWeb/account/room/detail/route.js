const _ = require('lodash');
const { routeStore } = require('@vl/mod-utils/adminRouteStore');

routeStore.addRule('toolAccountRoomDetail', {
  url: (room) => {
    const { account } = room;
    let accountId = _.get(account, 'id');
    let slug = _.get(account, 'slug');
    let queryString = '';
    if (slug) {
      queryString = routeStore.queryString({ id: _.get(room, 'id') });
      return `/${slug}/room${queryString}`;
    }
    if (accountId) {
      queryString = routeStore.queryString({ accountId, id: _.get(room, 'id') });
      return `/account/room${queryString}`;
    }
    return '/account/room';
  },
  parse: (urlObject) => {
    const params = {};
    for (let param in urlObject.searchParams) {
      params[param] = urlObject.searchParams.get(param);
    }
    return params;
  },
  match: (urlObject) => {
    return urlObject.pathname === 'account/room';
  },
});
