module.exports.emailparser = {
    // apply global first, then override with individual filter modifiers
    beforeModifyData: function (pe) {
        pe.data = _.cloneDeep(pe.extracted_data);
        if (!pe.extracted_data.currency)
            pe.data.currency = 'INR';
        // default is expense, so negative, if specific filter is a credit then explicitly mark as income
        pe.data.original_amount = -(pe.extracted_data.amount);
        pe.data.type = 'income_expense';
        pe.data.third_party = pe.extracted_data.whom_you_paid ? pe.extracted_data.whom_you_paid : pe.extracted_data.third_party;
        if (pe.data.date && pe.data.time) {
            pe.data.occuredAt = new Date(pe.data.date + ' ' + pe.data.time + '+5:30');
            if (pe.data.occuredAt == 'Invalid Date')
                pe.data.occuredAt = pe.data.email_received_time;
        }
        else
            pe.data.occuredAt = pe.data.email_received_time;

        //default acc_number
        if (pe.data.credit_card_last_4_digits)
            pe.data.acc_number = pe.data.credit_card_last_4_digits;
        else if (pe.data.account_last_4_digits)
            pe.data.acc_number = pe.data.account_last_4_digits;
        return pe
    },
    afterModifyData: function(pe){
        const fx = require('money');
        fx.base = 'INR';
        fx.rates = sails.config.fx_rates;
        pe.data.amount_inr = fx.convert(pe.data.original_amount, { from: pe.data.currency, to: "INR" });
        return pe
    },
    filters: [
        {
            name: 'IciciCreditCardTransactionAlertFilter',
        },
        {
            name: 'IciciInternetBankingFilter',
        },
        {
            name: 'IciciDebitCardFilter',
        },
        {
            name: 'IciciCreditCardRefundFilter',
            modifyData: function (pe) {
                pe.data.original_amount = pe.data.amount;
                return pe;
            }
        },
        {
            name: 'HdfcUpiFilter',
        },
        {
            name: 'HdfcNetBankingFilter',
        },
        {
            name: 'CitibankCreditCardTransactionFilter',
        },
        {
            name: 'AmazonPayTransactionFilter',
            modifyData: function (pe) {
                pe.data.acc_number = pe.email + '-amazon_pay';
                return pe;
            }
        },
        {
            name: 'AmazonPayCashbackFilter',
            modifyData: function (pe) {
                pe.data.acc_number = pe.email + '-amazon_pay';
                pe.data.original_amount = pe.extracted_data.amount;
                return pe;
            }
        },
        {
            name: 'AmazonPayExternalFilter',
            modifyData: function (pe) {
                pe.data.acc_number = pe.email + '-amazon_pay';
                return pe
            }
        },
        {
            name: 'HdfcBankBalanceFilter',
            modifyData: function (pe) {
                pe.data.type = 'balance';
                return pe
            }
        },
        {
            name: 'ZerodhaTransferFilter',
            modifyData: function (pe) {
                pe.data.acc_number = pe.email + '-zerodha';
                pe.data.type = 'transfer'
                return pe
            }
        },
        {
            name: 'HdfcBankAccountCreditFilter',
            modifyData: function (pe) {
                pe.data.original_amount = pe.extracted_data.amount;
            }
        },
        {
            name: 'YesBankCreditCardTransactionFilter'
        },
        {
            name: 'SBIDebitCardFilter'
        },
        {
            name: 'SBIOnlineTransactionFilter'
        },
        {
            name: 'SBIToSBIFilter'
        },
        {
            name: 'SBIRtgsFilter',
            modifyData: function (pe) {
                if (pe.body_parser_used == 'credit_v1')
                    pe.data.original_amount = pe.extracted_data.amount;
                return pe.data
            }
        },
        {
            name: 'SBINeftFilter',
            modifyData: function (pe) {
                if (pe.body_parser_used == 'credit_v1')
                    pe.data.original_amount = pe.extracted_data.amount;
                return pe
            }
        },
        {
            name: 'PaytmFilter',
            modifyData: function (pe) {
                if (pe.body_parser_used == 'received_money_v1') {
                    pe.data.third_party = pe.extracted_data.from_phone + '(' + pe.extracted_data.from_name + ')';
                    pe.data.acc_number = pe.extracted_data.to;
                } else {
                    pe.data.acc_number = pe.extracted_data.from_phone;
                    if (pe.extracted_data.to_phone)
                        pe.data.third_party = pe.extracted_data.to_phone + '(' + pe.extracted_data.to_name + ')';
                    else
                        pe.data.third_party = pe.extracted_data.to_name;
                }
                return pe;
            }
        }
    ]

}