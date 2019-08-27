// Copyright (c) 2019, Yefri Tavarez and contributors
// For license information, please see license.txt

frappe.ui.form.on('Expense Claim Request', {
	refresh: function (frm) {
		frappe.run_serially([
			() => frm.trigger("add_custom_buttons"),
		]);
	},
	add_custom_buttons: frm => {
		const { doc } = frm;
		const { user } = frappe;

		const is_allowed = user
			.has_role("HR Manager");




		if (doc.docstatus === 1 && is_allowed) {
			frm.trigger("add_make_payment_request_btn");
		}
	},
	add_make_payment_request_btn: frm => {

	}
});

frappe.ui.form.on('Expense Claim Detail Request', {
	claim_amount: function (frm) {
		frm.call("calculate_totals")
			.then(response => {
				frm.refresh();
			});
	}
});