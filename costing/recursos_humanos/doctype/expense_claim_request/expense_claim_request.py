# -*- coding: utf-8 -*-
# Copyright (c) 2019, Yefri Tavarez and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

from frappe.utils import flt

class ExpenseClaimRequest(Document):
	def validate(self):
		self.calculate_totals()

	def calculate_totals(self):
		total_claim_amount = .000

		if not self.expenses:
			return False

		total_claim_amount = self.get_claim_amounts()

		self.total_amount_reimbursed = total_claim_amount

	def get_claim_amounts(self):
		return reduce(lambda a,b: flt(b.claim_amount) + a, self.expenses, .000)
