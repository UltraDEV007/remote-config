const template = [
  {
    name: 'purchase',
    type: 'purchase',
    amount: '-{{= @input.amount - @item.discount.amount}}',
    wallet_id: '@helpers.getUserWalletId',
    target_id: '@input.user_id',
    tx_type: 'payment',
  },
  {
    name: 'advisor_income',
    type: 'advisor_income',
    amount: '{{= @input.amount - @item.platform_income.amount}}',
    wallet_id: '@helpers.getAdvisorWalletId',
    target_id: '@input.advisor_id',
    tx_type: 'payment',
  },
  {
    name: 'advisor_tax',
    type: 'advisor_tax',
    amount: '{{= Math.ceil(@item.advisor_income.amount * @config.advisorTax)}}',
    target_id: '@input.advisor_id',
  },
  {
    name: 'platform_income',
    type: 'platform_income',
    amount: '{{= Math.ceil(@input.amount * @config.platformFee) }}',
    wallet_id: '@helpers.getPlatformWalletId',
    tx_type: 'charge_payment',
  },
  {
    name: 'platform_tax',
    type: 'platform_tax',
    amount: '{{= @item.platform_income.amount * @config.platformTax}}',
  },
  {
    name: 'subtotal',
    type: 'subtotal',
    amount: '{{= @item.advisor_income.amount + @item.platform_income.amount}}',
  },
  {
    name: 'tax',
    type: 'tax',
    amount: '{{= @item.advisor_tax.amount + @item.platform_tax.amount}}',
  },
  {
    name: 'discount',
    type: 'discount',
    amount: '@helpers.getDiscountAmount',
  },
  {
    name: 'total',
    type: 'total',
    amount: '{{= @input.amount}}',
  },
];

exports.template = template;

const config = {
  version: 1,
  platformFee: 0.2,
  advisorTax: 0.05,
  platformTax: 0.05,
};

exports.config = config;
