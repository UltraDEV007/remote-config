exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!, $purchase_id: uuid!) {
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
    purchase: purchase_by_pk(id: $purchase_id) {
      course_rooms {
        id
      }
      courses {
        pricing_type
        price_amount
        price_currency
        per_amount
        per_unit
        course {
          id
          name
          description
        }
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'purchase.user_id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
    purchase_id: _.get(payload, 'purchase.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'purchase.courses.0.course');
  const per_unit = _.get(ctxData, 'purchase.courses.0.per_unit');
  const per_amount = _.get(ctxData, 'purchase.courses.0.per_amount');
  const price_amount = _.get(ctxData, 'purchase.courses.0.price_amount');
  const price_currency = _.get(ctxData, 'purchase.courses.0.price_currency');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');
  const courseDisplayName = _.get(course, 'name');

  const title = `${userDisplayName} đã mua khoá học ${courseDisplayName}.`;
  const body =
    per_unit === 'per_session'
      ? `Than toán ${helpers.formatCurrencySSR(price_amount, price_currency)} cho ${per_amount} buổi`
      : `Trọn gói: ${helpers.formatCurrencySSR(price_amount, price_currency)}`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.room.reminder',
      purchase_id: _.get(payload, 'purchase.id'),
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
        channelId: 'unitz-notifee-video-channel-2',
      },
      notification: {
        sound: 'notification',
        channelId: 'unitz-notifee-video-channel-2',
      },
    },
  };
};
