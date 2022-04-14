exports.getQuery = () => `
  query($advisor_id: String!, $course_id: uuid!) {
    advisor: advisor_by_pk(id: $advisor_id) {
      id
      profile {
        display_name
      }
    }
    course: course_by_pk(id: $course_id) {
      id
      name
      start_at
      pricing_type
      price_amount
      price_currency
      per_amount
      per_unit
      session_duration
      session_occurence
      sessions {
        id
        is_active
      }
      first_room: rooms(order_by: {start_at: asc}, limit: 1) {
        start_at
      }
      purchases {
        purchase {
          transaction_purchases {
            transaction {
              statement {
                id
                name
                type
                amount
              }
              user {
                profile {
                  display_name
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    course_id: _.get(payload, 'course.id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {};

exports.effect = async (
  { payload },
  { ctxData, utils, helpers, clients: { slackClient, hasuraClient, sendgridClient, routeWebClient } }
) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(ctxData, 'advisor.id');
  const course = _.get(ctxData, 'course');

  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));
  const courseDisplayName = routeWebClient.getClient().toAdminLink('admin.course', course);

  const $start_at = moment(_.get(course, 'start_at'));

  const title = `Khoá học "${courseDisplayName}" của ${advisorDisplayName} đã được công bố.`;
  const body = `Ngày bắt đầu: ${_.capitalize(
    $start_at
      .locale('vi')
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_DAY_FULL_FORMAT)
  )}`;

  await slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.course.publish',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: title,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: body,
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
  });
};
