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
      purchases {
        purchase {
          transaction_purchase {
            transaction {
              statement {
                id
                name
                type
                amount
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
    advisor_id: _.get(payload, 'course.advisor_id'),
    course_id: _.get(payload, 'course.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'course');

  const courseDisplayName = _.get(course, 'name');

  const statements = helpers.flattenGet(course, 'purchases.purchase.transaction_purchase.transaction.statement');

  const amount = _.sumBy(_.filter(statements, { name: 'advisor_income' }), 'amount');

  const title = `Khoá học ${courseDisplayName} đã hoàn tất`;
  const body = `Bạn nhận được ${helpers.formatCurrencySSR(amount)}`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.course.paid',
      course_id: _.get(course, 'id') || '',
      sound: 'sound1',
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'notification.mp3',
        },
      },
    },
    android: {
      priority: 'high',
      data: {
        sound: 'notification',
      },
      notification: {
        sound: 'notification',
      },
    },
  };
};

exports.effect = async ({ payload }, { ctxData, helpers, clients: { slackClient, hasuraClient } }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'course');

  const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const courseDisplayName = _.get(course, 'name');
  const advisor_id = _.get(ctxData, 'advisor.id');

  const statements = helpers.flattenGet(course, 'purchases.purchase.transaction_purchase.transaction.statement');
  const advisor_income = _.sumBy(_.filter(statements, { name: 'advisor_income' }), 'amount');
  const platform_income = _.sumBy(_.filter(statements, { name: 'platform_income' }), 'amount');

  await hasuraClient.getClient().request(
    `
    mutation upsertnotifevent($payload: jsonb, $type: String) {
      insert_notification_one(
        object: {
          owner_id: "${advisor_id}"
          type_id: $type
          payload: $payload
        }
      ) {
        id
      }
    }
  `,
    {
      type: 'advisor.course.paid',
      payload,
    }
  );

  const title = `Khoá học "${courseDisplayName}" của ${advisorDisplayName} đã được thanh toán.`;
  const body = `Income: ${helpers.formatCurrencySSR(advisor_income)} / ${helpers.formatCurrencySSR(platform_income)}`;

  console.log('title', title, body);

  await slackClient.getClient().client.chat.postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.course.paid',
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
    channel: 'C02P4M8KFBK',
  });
};
