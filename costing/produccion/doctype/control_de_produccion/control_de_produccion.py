# -*- coding: utf-8 -*-
# Copyright (c) 2018, Yefri Tavarez and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

from costing.produccion.doctype.orden_de_produccion import field_set_list
from frappe.utils import cint, cstr, flt, now_datetime, date_diff

class ControldeProduccion(Document):
	def validate(self):
		if cstr(self.time_stamp) > cstr(now_datetime()):
			frappe.throw("Time Stamp cannot be greater than now")
			
	def on_submit(self):
		doc = frappe.get_doc("Orden de Produccion", self.production_order)

		uncompletes = [d for d in self.get_field_set(doc) if not doc.get(d.get("status")) == "Completada"]
		if not uncompletes:
			frappe.throw("This Production Order has no more Uncompleted Operations in the selected Workstation")

		self.prev_status = doc.get(uncompletes[0].get("status"))

		self.validate_change_status(doc, uncompletes[0].get("last_status"))

		doc.set(uncompletes[0].get("status"), self.operation_status)
		doc.set(uncompletes[0].get("last_status"), self.workstation_state)

		self.post_status = self.operation_status

		if self.operation_status in ("Preparacion", "Corriendo"):
			doc.set(uncompletes[0].get("real_start_time"), cstr(self.time_stamp))

		elif self.operation_status in ("Abortada", "Completada"):
			if not doc.get(uncompletes[0].get("real_start_time")):
				frappe.throw("Operation not started yet")

			doc.set(uncompletes[0].get("real_end_time"), cstr(self.time_stamp))

			real_time_in_seconds = frappe.utils.time_diff(self.time_stamp, 
				doc.get(uncompletes[0].get("real_start_time"))).total_seconds()

			real_time_in_minutes = flt(real_time_in_seconds) / cint(60)
			doc.set(uncompletes[0].get("real_time_in_minutes"), real_time_in_minutes)

			hour_rate = doc.get(uncompletes[0].get("hour_rate"))

			doc.set(uncompletes[0].get("real_total_cost"), flt(hour_rate) * flt(real_time_in_minutes) / 60)

			if "desperdicio" in self.operation_name.lower():
				in_qty = doc.get(uncompletes[0].get("in_qty"))

				doc.set(uncompletes[0].get("out_qty"), cint(in_qty) - cint(self.qty))
			else:
				doc.set(uncompletes[0].get("out_qty"), self.qty)

			self.set("operation", uncompletes[0].get("operation"))

		doc.update_modified()
		doc.db_update()
		
	def on_cancel(self):
		doc = frappe.get_doc("Orden de Produccion", self.production_order)

	def get_field_set(self, doc, based_on="station"):
		if not self.workstation:
			frappe.throw("Missing Workstation")

		result_set = []
		
		for d in field_set_list:
			fieldname = d.get(based_on)

			if doc.get(fieldname) == self.workstation:
				result_set += [d]

		return result_set

	def validate_change_status(self, p_order, last_status):
		if self.prev_status == "Completada":
			frappe.throw("Cant't change status of Completed Operation.")

		if self.operation_status == self.prev_status and p_order.get(last_status) == self.workstation_state:
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
		AND 
			(workstation_state LIKE '%%%s%%'
				OR workstation_state_name LIKE '%%%s%%')
		""" % (filters.get("workstation"), txt, txt), as_list=True)