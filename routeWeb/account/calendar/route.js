// const _ = require('lodash');
// const { routeStore } = require('@vl/mod-utils/adminRouteStore');
// const { routeStore } = require('@vl/mod-utils/gatsbyRouteStore');
// const { getGbRoute } = require('@vl/hooks/useGbRouteDe');

// const { _, routeStore, getRoute } = require('@vl/mod-utils/router')();

// routeStore.addRule('toolAccountCalendar', {
//   url: (params) => {
//     params = _.merge({}, params, _.get(getRoute().getPageContext(), 'params'));
//     const id = _.get(params, 'id');
//     let accountId = _.get(getRoute().getParams(), 'accountId');
//     const queryString = routeStore.queryString({ accountId });
//     const slug = _.get(params, 'slug');
//     if (slug) {
//       return `/${slug}/calendar${queryString}`;
//     }
//     if (accountId) {
//       return `/account/calendar${queryString}`;
//     }
//     return `${getRoute().getDefaultAccountRoute(`/calendar${queryString}`)}`;
//   },
//   parse: (urlObject) => {
//     const params = {};
//     for (let param in urlObject.searchParams) {
//       params[param] = urlObject.searchParams.get(param);
//     }
//     return params;
//   },
//   match: (urlObject) => {
//     return urlObject.pathname === 'account/calendar';
//   },
// });
