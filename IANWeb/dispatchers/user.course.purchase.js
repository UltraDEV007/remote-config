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
      first_room: course_rooms(order_by: {room: {start_at: asc}}, limit: 1) {
        id
        room {
          start_at
          id
        }
      }
      course_rooms_aggregate {
        aggregate {
          count
        }
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
          start_at
          session_duration
          session_occurence
          sessions {
            id
            is_active
          }
          first_room: rooms(order_by: {start_at: asc}, limit: 1) {
            start_at
          }
          purchases(where: {purchase: {user_id: {_eq: $user_id}, status_latest: {status: {_eq: "completed"}}}}) {
            id
            price_amount
            per_amount
            is_active
            purchase {
              statement {
                amount
                id
              }
              user_id
            }
          }
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

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _ } = helpers;
  console.log('ctxData', ctxData);

  return {
    ...ctxData,
  };
};
