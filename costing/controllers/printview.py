# -*- coding: utf-8 -*-
# Copyright (c) 2018, Yefri Tavarez and contributors
# For license information, please see license.txt

import frappe

from frappe.utils.pdf import get_pdf

@frappe.whitelist()
def download_pdf(doctype, name, format=None, doc=None):
	opts = {
		"page-size": "A4",
	}

	if doctype in ("Orden de Produccion",):
		opts = {
			"page-size": "Legal",
		}

	html = frappe.get_print(doctype, name, format, doc=doc)
	frappe.local.response.filename = "{name}.pdf".format(name=name.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = get_pdf(html, opts)
	frappe.local.response.type = "download"