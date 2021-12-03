exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!) {
    user: user_by_pk(id: $user_id) {
      id
      profile {
        display_name
      }
    }
    advisor: advisor_by_pk(id: $advisor_id) {
      id
      profile {
        display_name
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'session.user_id'),
    advisor_id: _.get(payload, 'session.advisor_id'),
  };
};

exports.render = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _, moment, i18n } = helpers;

  const advisor_id = _.get(payload, 'session.advisor_id');
  const service = _.get(payload, 'purchase.service_bookings.0');
  const $start_at = moment(_.get(service, 'start_at'));
  const duration = _.get(payload, 'session.session_duration');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');

  const title = i18n.t('booking.notification.title', { userDisplayName:  });
  // `Lịch hẹn với ${userDisplayName} đã bị huỷ.`);
  const body = `Gói ${helpers.formatCallDuration(duration)} - ${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)}`;

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: title,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'This is a section {{session.advisor_id}} block with a button.',
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Click Me',
            emoji: true,
          },
          value: 'click_me_123',
          action_id: 'button-action',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text:
              '👀 View all tasks with `/task list`\n❓Get help at any time with `/task help` or type *help* in a DM with me',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            "*2️⃣ {{userDisplayName}} the _Create a Task_ action.* If you want to create a task from a message, select `Create a Task` in a message's context menu. Try it out by selecting the _Create a Task_ action for this message (shown below).",
        },
      },
      {
        type: 'image',
        title: {
          type: 'plain_text',
          text: 'image1',
          emoji: true,
        },
        image_url: 'https://api.slack.com/img/blocks/bkb_template_images/onboardingComplex.jpg',
        alt_text: 'image1',
      },
      {
        type: 'divider',
      },
    ],
  };
};
