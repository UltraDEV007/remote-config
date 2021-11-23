const template = [
  {
    name: 'purchase',
    type: 'purchase',
    amount: '{{= @item.total.amount }}',
    wallet_id: '@helpers.getUserWalletId',
    target_id: '@input.user_id',
    tx_type: 'deposit',
  },
  {
    name: 'platform_iss',
    type: 'platform_iss',
    amount: '-{{= @item.total.amount }}',
    wallet_id: '@helpers.getPlatformWalletId',
    tx_type: 'iss_deposit',
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
    amount: '{{= @item.subtotal.amount + @item.discount.amount}}',
  },
];

exports.template = template;

const config = {
  version: 1,
  platformFee: 0.2,
};

exports.config = config;
