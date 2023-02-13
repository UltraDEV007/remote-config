const _ = require('lodash');
const { routeStore } = require('@vl/mod-utils/adminRouteStore');

routeStore.addRule('toolAccountCourseDetail', {
  url: (course) => {
    const account = _.get(course, 'account');
    let accountId = _.get(account, 'id');
    let slug = _.get(account, 'slug');
    let queryString = '';
    if (slug) {
      queryString = routeStore.queryString({ id: _.get(course, 'id') });
      return `/${slug}/course${queryString}`;
    }
    if (accountId) {
      queryString = routeStore.queryString({ accountId, id: _.get(course, 'id') });
      return `/account/course${queryString}`;
    }
    return '/account/course';
  },
  parse: (urlObject) => {
    const params = {};
    for (let param in urlObject.searchParams) {
      params[param] = urlObject.searchParams.get(param);
    }
    return params;
  },
  match: (urlObject) => {
    return urlObject.pathname === 'account/course';
  },
});
