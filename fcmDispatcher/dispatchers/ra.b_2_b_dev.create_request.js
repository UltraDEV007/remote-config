exports.getQuery = () => `
  query($account_id: uuid!) {
    ar: b2b_approval_request_by_pk(id: $ar_id) {
      id
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    ar_id: _.get(payload, 'id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils, clients: { routeWebClient } }) => {
  const { _, moment } = helpers;
  const rtn = rtn;
  console.log('rtn', rtn);
  return rtn;
};

exports.effect = async ({ payload }, { ctxData, helpers, utils, clients }) => {
  const { _, moment } = helpers;

  // const account = _.get(ctxData, 'account');

  // const user_id = _.get(ctxData, 'user.id');
  // const i18n = await utils.forUser(user_id);

  // slack message effect
  clients.slackClient.getClient().postMessage({
    text: 'title',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: _.get(payload, 'type'),
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'title',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'body',
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
    // channel: 'C02P4M8KFBK',
  });
  // send email effect
  // clients.sendgridClient.getClient().sendEmail(user_id, {
  //   template: {
  //     name: i18n.getTemplateSuffixName('tool.member.created'),
  //   },
  //   ...i18n.getContactEmailInfo('tool.member.created'),
  //   ...ctxData,
  //   organization_name: _.get(account, 'profile.display_name'),
  //   admin_name: _.get(account, 'profile.display_name'),
  //   login: {
  //     link: clients.routeWebClient.getClient().toToolUrl('toolAccountDetail', account),
  //   },
  //   route: {
  //     user_url: clients.routeWebClient.getClient().toToolUrl('profile'),
  //     account_url: clients.routeWebClient.getClient().toToolUrl('toolAccountDetail', account),
  //     verify_email_url: _.get(payload, 'link.verifyEmail'),
  //     unsubscribe_url: '/',
  //   },
  // });
};
