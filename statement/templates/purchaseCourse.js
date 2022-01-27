const template = [
  {
    name: 'purchase',
    type: 'purchase',
    amount: '{{= @input.amount}}',
    wallet_id: '@helpers.getUserWalletId',
    target_id: '@input.user_id',
    tx_type: 'payment',
  },
  {
    name: 'subtotal',
    type: 'subtotal',
    amount: '{{= @input.amount}}',
  },
  {
    name: 'discount',
    type: 'discount',
    amount: '@helpers.getDiscountAmount',
  },
  {
    name: 'total',
    type: 'total',
    amount: '{{= @input.amount - @item.discount.amount}}',
  },
];

exports.template = template;

const config = {
  version: 1,
};

exports.config = config;
