# -*- coding: utf-8 -*-
# Copyright (c) 2018, Yefri Tavarez and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

from costing.produccion.doctype.orden_de_produccion import field_set_list
from datetime import datetime

class ControldeProduccion(Document):
	def on_submit(self):
		doc = frappe.get_doc("Orden de Produccion", self.production_order)

		uncompletes = [d for d in self.get_field_set(doc) if not doc.get(d.get("status")) == "Completada"]
		if not uncompletes:
			frappe.throw("This Production Order has no more Uncompleted Operations in the selected Workstation")

		# frappe.errprint(uncompletes[0])

		# frappe.errprint("self.operation_status {}".format(self.operation_status))
		# frappe.errprint("uncompletes[0].get('status') {}".format(uncompletes[0].get('status')))

		self.prev_status = doc.get(uncompletes[0].get("status"))

		self.validate_change_status()

		doc.set(uncompletes[0].get("status"), self.operation_status)
		self.post_status = self.operation_status

		# frappe.errprint(doc.as_json())
		doc.update_modified()
		doc.db_update()
		# frappe.db.commit()
		
	def on_cancel(self):
		doc = frappe.get_doc("Orden de Produccion", self.production_order)

	def get_field_set(self, doc, based_on="station"):
		if not self.workstation:
			frappe.throw("Missing Workstation")

		result_set = []
		
		for d in field_set_list:
			fieldname = d.get(based_on)

			if doc.get(fieldname) == self.workstation:
				# frappe.errprint("doc.get(fieldname) {}".format(doc.get(fieldname)))
				# frappe.errprint("self.workstation {}".format(self.workstation))
				result_set += [d]

		return result_set

	def validate_change_status(self):
		if self.prev_status == "Completada":
			frappe.throw("Cant't change status of Completed Operation.")

		if self.operation_status == self.prev_status:
			frappe.throw("Must select a different status since the last status set was the same.")

def get_query_workstation(doctype, txt, searchfield, start, page_len, filters):
	return frappe.db.sql("""
		SELECT
			workstation_state,
			workstation_state_name
		FROM
			tabWorkstations
		WHERE
			parent = '%s'
		""" % filters.get("workstation"), as_list=True)