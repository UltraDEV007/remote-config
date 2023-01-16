exports.getQuery = () => `
  query($user_id: String!) {
    user: user_by_pk(id: $user_id) {
      id
      profile {
        display_name
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'user.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils, clients: { routeWebClient } }) => {
  const rtn = {};
  return rtn;
};

exports.effect = async ({ payload }, { ctxData, helpers, utils, clients }) => {
  const { _, moment } = helpers;

  const account = _.get(ctxData, 'account');
  const user = _.get(ctxData, 'user');

  const user_id = _.get(ctxData, 'user.id');
  const i18n = await utils.forUser(user_id);

  // send email effect
  try {
    const emailPayload = {
      template: {
        name: i18n.getTemplateSuffixName('tool.auth.sendVerificationEmail'),
      },
      ...ctxData,
      subject: 'Verify your email for UnitzApp',
      admin_name: _.get(user, 'profile.display_name'),
      login: {
        link: clients.routeWebClient.getClient().toToolUrl('toolAccountDetail', account),
      },
      route: {
        user_url: clients.routeWebClient.getClient().toToolUrl('profile'),
        verify_email_url: _.get(payload, 'link.verifyEmail'),
        unsubscribe_url: '/',
      },
    };
    console.log('emailPayload', emailPayload);
    await clients.sendgridClient.getClient().sendEmail(user_id, emailPayload);
  } catch (err) {
    console.log('sendmail error', err);
  }
};
