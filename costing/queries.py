# -*- coding: utf-8 -*-
# Copyright (c) 2018, Yefri Tavarez and contributors
# For license information, please see license.txt

import frappe

from frappe.utils import cint, cstr, flt

def material_dimension_query(doctype, txt, searchfield, start, page_len, filters):
	filters.update({
		"txt": "%{}%".format(txt) if txt else "%"
	})

	dimension_list = frappe.db.sql("""SELECT DISTINCT
			parent AS material
		FROM
			`tabMaterial de Impresion Items` 
		WHERE
			parenttype = "Dimensiones"
			AND parentfield = "materials"
			AND materials = %(material)s
			AND parent LIKE %(txt)s 
		""", filters, 
	as_dict=True)

	return [[row.material] for row in dimension_list]