module.exports={
    /**
     * spending_per_month is an array of spending, grouped by year and month.
     */
    generateTimePeriods:function(spending_per_month){
        var time_periods=[];
        spending_per_month.forEach(function (row) {
            var time_period_exists = false;
            time_periods.forEach(function (time_period) {
                if (time_period.year == row.year && time_period.month == row.month)
                    time_period_exists = true;
            })
            if (!time_period_exists)
                time_periods.push({ year: row.year, month: row.month });
        })
        return time_periods
    },
    generatePnLScafolding:function(pnl_from_db){
        var pnl = pnl_from_db ? pnl_from_db:{};
        pnl.header = {
            "level_1": [],
            "level_2": []
        }
        pnl.body = [
            { // these ones will be the header
                "name": 'income',
                "data": {},
                "children": []

            },
            {
                "name": 'expense',
                "data": {},
                "children": []
            },
            {
                "name": "surplus",
                "data": {},
                "children": []
            }
        ];
        return pnl;
    },
    /**
     * categories - are flat, directly queried from the db
     */
    generateRowScafoldingForSinglePNLHead:function(categories,pnl_head){
        var pnl_body=[
            { // these ones will be the header
                "name": 'income',
                "data": {},
                "children": []

            },
            {
                "name": 'expense',
                "data": {},
                "children": []
            },
            {
                "name": "surplus",
                "data": {},
                "children": []
            }
        ];
        var hier_categories = GeneralService.orderCategories(categories);
        var head_category;
        hier_categories.forEach(function (c) {
            if (c.id == pnl_head) {
                head_category = c;
            }
        });
        head_category.children.forEach(function (c) {
            var row = { // these ones will be the header
                "name": c.name,
                "data": {},
                "children": []
            };
            if (c.type == 'income' || c.type == 'expense') {
                var temp = _.find(pnl_body, { "name": c.type });
                temp.children.push(row);
            }
        })
        return pnl_body;
    },
    generateRowScafoldingForMultiplePNLHeads: function (flat_categories){
        var pnl_body = [
            { // these ones will be the header
                "name": 'income',
                "data": {},
                "children": []

            },
            {
                "name": 'expense',
                "data": {},
                "children": []
            },
            {
                "name": "surplus",
                "data": {},
                "children": []
            }
        ];
        var hier_categories = GeneralService.orderCategories(flat_categories);
        hier_categories.forEach(function(pnl_head_c){
            if(pnl_head_c.type=='pnl_head'){
                pnl_head_c.children.forEach(function(c){
                    var row = { // these ones will be the header
                        "name": c.name,
                        "data": {},
                        "children": []
                    };
                    if (c.type == 'income' || c.type == 'expense') {
                        var row_l1 = _.find(pnl_body, { "name": c.type });
                        var existing_row_l2 = _.find(row_l1.children, { name: c.name });
                        if (!existing_row_l2) // if the name does not exist, then add
                            row_l1.children.push(row);
                    }
                })
            }
        })
        return pnl_body;
    },
    populateDataForSinglePNLHead: function (pnl_body, categories_by_time,pnl_head){
        pnl_body.forEach(function (row_l1, i) { // income, expense, surplus
            Object.keys(categories_by_time).forEach(function (month, i) {
                var head_cat = _.find(categories_by_time[month], { id: pnl_head });
                row_l1.data[month + '__' + head_cat.name] = 0;
                row_l1.children.forEach(function (row_l2) {
                    head_cat.children.forEach(function (cat2) {
                        if (cat2.name == row_l2.name) {
                            row_l2.data[month + '__' + head_cat.name] = cat2.super_sum;
                            row_l1.data[month + '__' + head_cat.name] += cat2.super_sum;
                        }
                    })
                    row_l2.children.forEach(function (row_l3) {
                        head_cat.children.forEach(function (cat2) {
                            cat2.children.forEach(function (cat3) {
                                if (cat3.name == row_l3.name)
                                    row_l3.data[month + '__' + head_cat.name] = cat2.super_sum;

                            })
                        })
                    })
                });
                if (row_l1.name == 'surplus') { // custom calculation for surplus
                    row_l1.data[month + '__' + head_cat.name] = pnl_body[0].data[month + '__' + head_cat.name] + pnl_body[1].data[month + '__' + head_cat.name];
                }
            })
        })
        return pnl_body;
    },
    populateDataForMultiplePNLHeads: function (pnl_body, categories_by_time){
        pnl_body.forEach(function (row_l1, i) { // income, expense, surplus
            Object.keys(categories_by_time).forEach(function (month, i) {
                categories_by_time[month].forEach(function(head_cat){

                    // var head_cat = _.find(categories_by_time[month], { id: pnl_head });
                    row_l1.data[month + '__' + head_cat.name] = 0;
                    row_l1.children.forEach(function (row_l2) {
                        head_cat.children.forEach(function (cat2) {
                            if (cat2.name == row_l2.name) {
                                row_l2.data[month + '__' + head_cat.name] = cat2.super_sum;
                                row_l1.data[month + '__' + head_cat.name] += cat2.super_sum;
                            }
                        })
                        row_l2.children.forEach(function (row_l3) {
                            head_cat.children.forEach(function (cat2) {
                                cat2.children.forEach(function (cat3) {
                                    if (cat3.name == row_l3.name)
                                        row_l3.data[month + '__' + head_cat.name] = cat2.super_sum;

                                })
                            })
                        })
                    });
                    if (row_l1.name == 'surplus') { // custom calculation for surplus
                        row_l1.data[month + '__' + head_cat.name] = pnl_body[0].data[month + '__' + head_cat.name] + pnl_body[1].data[month + '__' + head_cat.name];
                    }

                });
            })
        })
        return pnl_body;
    },
    calculateCategorySpendingPerTimePeriod: function (flat_categories,time_periods,spending_per_category_per_month){
        var temp = {};
        var categories_by_time = {};
        time_periods.forEach(function (tp) {
            temp[tp.year + '-' + tp.month] = _.cloneDeep(flat_categories);
            temp[tp.year + '-' + tp.month].forEach(function (cat) {

                cat.t_count = 0;
                cat.t_sum = 0;
                // console.log(results.getCategorySpending);
                spending_per_category_per_month.forEach(function (spend) {
                    if (cat.id == spend.category && tp.year == spend.year && tp.month == spend.month) {
                        cat.t_count = spend.count;
                        cat.t_sum = spend.sum;
                    }
                })
                // console.log(cat);
            });
            categories_by_time[tp.year + '-' + tp.month] = _.cloneDeep(GeneralService.orderCategories(temp[tp.year + '-' + tp.month]));
        });
        return categories_by_time;
    }
}