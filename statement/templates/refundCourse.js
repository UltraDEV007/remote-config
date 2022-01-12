const template = [
  {
    name: 'refund',
    type: 'refund',
    amount: '{{= @input.amount}}',
    wallet_id: '@helpers.getUserWalletId',
    target_id: '@input.user_id',
    tx_type: 'refund',
  },
  {
    name: 'platform_iss',
    type: 'platform_iss',
    amount: '-{{= @input.amount }}',
    wallet_id: '@helpers.getPlatformWalletId',
    tx_type: 'refund',
  },
];

exports.template = template;

const config = {
  version: 1,
  platformFee: 0.1,
  advisorTax: 0,
  platformTax: 0,
};

exports.config = config;
