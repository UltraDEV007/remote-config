const _ = require('lodash');
const { routeStore } = require('@vl/mod-utils/adminRouteStore');

routeStore.addRule('toolAccountDetail', {
  url: (account) => {
    let accountId = _.get(account, 'id');
    let slug = _.get(account, 'slug');
    let queryString = '';
    if (slug) {
      return `/${slug}${queryString}`;
    }
    if (accountId) {
      queryString = routeStore.queryString({ accountId });
      return `/account${queryString}`;
    }
    return '/account/me';
  },
  parse: (urlObject) => {
    const params = {};
    for (let param in urlObject.searchParams) {
      params[param] = urlObject.searchParams.get(param);
    }
    return params;
  },
  match: (urlObject) => {
    return urlObject.pathname === 'account';
  },
});
