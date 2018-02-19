import frappe

def get_boot_info(bootinfo):
	holiday_doc = frappe.get_last_doc("Holiday List")

	bootinfo.year_holidays = []
	
	for holiday in holiday_doc.holidays:
		bootinfo.year_holidays += [holiday.holiday_date]

	bootinfo.general_conf = frappe.get_single("Configuracion General")