# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shipments.receive.execution.spec.ts >> shipment receive execution >> authorized user can execute one shipment receive flow
- Location: tests\e2e\shipments.receive.execution.spec.ts:218:3

# Error details

```
Error: expect(locator).not.toContainText(expected) failed

Locator: locator('main')
Expected pattern: not /Select a shipment to continue\./i
Received string: "ShipmentsCreate inbound shipments, add shipment items, receive lines partially or fully, and finalize the shipment when operations are complete.Create ShipmentSupplierSelect supplierBarcode Test Supplier 20260415182433BlueWave BeveragesCleanCore EssentialsFreshFoods LtdFreshRoute FoodsNorthwind Supply CoPrime Linen ServicesScanner Test Supplier 20260415145814Delivery DatePO NumberCreate ShipmentShipment ListFilter shipments and select one for line management and receiving.All statusesPendingPartialReceivedPO-BARCODE-TEST-20260415182433Shipment ID: d2eff186-0b72-4414-a88b-4a431e1def5cPENDINGSupplier: Barcode Test Supplier 20260415182433Delivery: 4/15/2026QR: SHIPMENT-QR-20260415182433Lines: 1Ordered: 10Received: 0PO-SCANNER-TEST-20260415145814Shipment ID: 869bb78b-392a-4b39-ae6c-84cef7f3328aPENDINGSupplier: Scanner Test Supplier 20260415145814Delivery: 4/15/2026QR: SCANNER-TEST-20260415145814Lines: 1Ordered: 10Received: 0DEMO-PO-1002Shipment ID: e2f22d63-5156-40c4-9921-b93ca4ba5a8cPARTIALSupplier: CleanCore EssentialsDelivery: 4/10/2026QR: DEMO-QR-1002Lines: 3Ordered: 30Received: 9DEMO-PO-1001Shipment ID: 72c8f3c4-b471-4d52-b2d9-57c1e9b2e3baRECEIVEDSupplier: BlueWave BeveragesDelivery: 4/8/2026QR: DEMO-QR-1001Lines: 2Ordered: 108Received: 108DEMO-PO-1004Shipment ID: 365496d9-73b2-4364-9ed0-37b747c319d4RECEIVEDSupplier: FreshRoute FoodsDelivery: 4/12/2026QR: DEMO-QR-1004Lines: 3Ordered: 44Received: 44DEMO-PO-1003Shipment ID: b5ab774e-91e8-48b4-a19a-811e6990962ePENDINGSupplier: Northwind Supply CoDelivery: 4/16/2026QR: DEMO-QR-1003Lines: 2Ordered: 240Received: 0PO-NW-1001Shipment ID: 8c2e3eb6-d4f3-4a5a-a7aa-5c07ab1b2590RECEIVEDSupplier: Northwind Supply CoDelivery: 4/8/2026QR: SHIP-1775682928926-857547C0Lines: 1Ordered: 25Received: 25PO-1001Shipment ID: 09dc4698-7f39-4280-b31d-3187044658daRECEIVEDSupplier: FreshFoods LtdDelivery: 4/8/2026QR: SHIP-1775679376998-0723BCD3Lines: 1Ordered: 2Received: 2No PO NumberShipment ID: ecd15708-5b2c-4c10-8715-0ebdb422055eRECEIVEDSupplier: FreshFoods LtdDelivery: 1/27/2026QR: REORDER-1769533761778-2669Lines: 1Ordered: 15Received: 0No PO NumberShipment ID: be947875-d367-4cd2-b908-d54a5615fc61PENDINGSupplier: FreshFoods LtdDelivery: 1/27/2026QR: REORDER-1769533422252-2783Lines: 1Ordered: 5Received: 0No PO NumberShipment ID: 6667494a-be48-4687-9217-9dcb55c7b0d7PARTIALSupplier: FreshFoods LtdDelivery: 1/26/2026QR: ALPHA-SHIP-001Lines: 2Ordered: 46Received: 0Selected ShipmentAdd shipment lines, receive stock into locations, and finalize the shipment.Select a shipment to continue."
Timeout: 5000ms

Call log:
  - Expect "not toContainText" with timeout 5000ms
  - waiting for locator('main')
    3 × locator resolved to <main>…</main>
      - unexpected value "ShipmentsCreate inbound shipments, add shipment items, receive lines partially or fully, and finalize the shipment when operations are complete.Create ShipmentSupplierSelect supplierDelivery DatePO NumberCreate ShipmentShipment ListFilter shipments and select one for line management and receiving.All statusesPendingPartialReceivedLoading shipments...Selected ShipmentAdd shipment lines, receive stock into locations, and finalize the shipment.Select a shipment to continue."
    6 × locator resolved to <main>…</main>
      - unexpected value "ShipmentsCreate inbound shipments, add shipment items, receive lines partially or fully, and finalize the shipment when operations are complete.Create ShipmentSupplierSelect supplierBarcode Test Supplier 20260415182433BlueWave BeveragesCleanCore EssentialsFreshFoods LtdFreshRoute FoodsNorthwind Supply CoPrime Linen ServicesScanner Test Supplier 20260415145814Delivery DatePO NumberCreate ShipmentShipment ListFilter shipments and select one for line management and receiving.All statusesPendingPartialReceivedPO-BARCODE-TEST-20260415182433Shipment ID: d2eff186-0b72-4414-a88b-4a431e1def5cPENDINGSupplier: Barcode Test Supplier 20260415182433Delivery: 4/15/2026QR: SHIPMENT-QR-20260415182433Lines: 1Ordered: 10Received: 0PO-SCANNER-TEST-20260415145814Shipment ID: 869bb78b-392a-4b39-ae6c-84cef7f3328aPENDINGSupplier: Scanner Test Supplier 20260415145814Delivery: 4/15/2026QR: SCANNER-TEST-20260415145814Lines: 1Ordered: 10Received: 0DEMO-PO-1002Shipment ID: e2f22d63-5156-40c4-9921-b93ca4ba5a8cPARTIALSupplier: CleanCore EssentialsDelivery: 4/10/2026QR: DEMO-QR-1002Lines: 3Ordered: 30Received: 9DEMO-PO-1001Shipment ID: 72c8f3c4-b471-4d52-b2d9-57c1e9b2e3baRECEIVEDSupplier: BlueWave BeveragesDelivery: 4/8/2026QR: DEMO-QR-1001Lines: 2Ordered: 108Received: 108DEMO-PO-1004Shipment ID: 365496d9-73b2-4364-9ed0-37b747c319d4RECEIVEDSupplier: FreshRoute FoodsDelivery: 4/12/2026QR: DEMO-QR-1004Lines: 3Ordered: 44Received: 44DEMO-PO-1003Shipment ID: b5ab774e-91e8-48b4-a19a-811e6990962ePENDINGSupplier: Northwind Supply CoDelivery: 4/16/2026QR: DEMO-QR-1003Lines: 2Ordered: 240Received: 0PO-NW-1001Shipment ID: 8c2e3eb6-d4f3-4a5a-a7aa-5c07ab1b2590RECEIVEDSupplier: Northwind Supply CoDelivery: 4/8/2026QR: SHIP-1775682928926-857547C0Lines: 1Ordered: 25Received: 25PO-1001Shipment ID: 09dc4698-7f39-4280-b31d-3187044658daRECEIVEDSupplier: FreshFoods LtdDelivery: 4/8/2026QR: SHIP-1775679376998-0723BCD3Lines: 1Ordered: 2Received: 2No PO NumberShipment ID: ecd15708-5b2c-4c10-8715-0ebdb422055eRECEIVEDSupplier: FreshFoods LtdDelivery: 1/27/2026QR: REORDER-1769533761778-2669Lines: 1Ordered: 15Received: 0No PO NumberShipment ID: be947875-d367-4cd2-b908-d54a5615fc61PENDINGSupplier: FreshFoods LtdDelivery: 1/27/2026QR: REORDER-1769533422252-2783Lines: 1Ordered: 5Received: 0No PO NumberShipment ID: 6667494a-be48-4687-9217-9dcb55c7b0d7PARTIALSupplier: FreshFoods LtdDelivery: 1/26/2026QR: ALPHA-SHIP-001Lines: 2Ordered: 46Received: 0Selected ShipmentAdd shipment lines, receive stock into locations, and finalize the shipment.Select a shipment to continue."

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Inventory Platform
      - generic [ref=e7]: Multi-tenant control center
      - generic [ref=e8]: "ROLE: ADMIN"
    - navigation [ref=e9]:
      - link "Dashboard" [ref=e10] [cursor=pointer]:
        - /url: /dashboard
      - link "Products" [ref=e11] [cursor=pointer]:
        - /url: /products
      - link "Suppliers" [ref=e12] [cursor=pointer]:
        - /url: /suppliers
      - link "Alerts" [ref=e13] [cursor=pointer]:
        - /url: /alerts
      - link "Stock" [ref=e14] [cursor=pointer]:
        - /url: /stock
      - link "Stock Movements" [ref=e15] [cursor=pointer]:
        - /url: /stock-movements
      - link "Storage Locations" [ref=e16] [cursor=pointer]:
        - /url: /storage-locations
      - link "Shipments" [ref=e17] [cursor=pointer]:
        - /url: /shipments
      - link "Scanner" [ref=e18] [cursor=pointer]:
        - /url: /scanner
      - link "Reports" [ref=e19] [cursor=pointer]:
        - /url: /reports
      - link "Sessions" [ref=e20] [cursor=pointer]:
        - /url: /sessions
    - button "Log out" [ref=e22] [cursor=pointer]
  - generic [ref=e23]:
    - banner [ref=e24]:
      - generic [ref=e26]:
        - generic [ref=e27]: Operations / Shipments
        - heading "Shipments" [level=1] [ref=e28]
        - paragraph [ref=e29]: Manage inbound shipment creation, receiving, and finalization.
    - main [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e33]:
          - heading "Shipments" [level=2] [ref=e34]
          - paragraph [ref=e35]: Create inbound shipments, add shipment items, receive lines partially or fully, and finalize the shipment when operations are complete.
        - generic [ref=e36]:
          - heading "Create Shipment" [level=3] [ref=e37]
          - generic [ref=e38]:
            - generic [ref=e39]:
              - generic [ref=e40]: Supplier
              - combobox [ref=e41]:
                - option "Select supplier" [selected]
                - option "Barcode Test Supplier 20260415182433"
                - option "BlueWave Beverages"
                - option "CleanCore Essentials"
                - option "FreshFoods Ltd"
                - option "FreshRoute Foods"
                - option "Northwind Supply Co"
                - option "Prime Linen Services"
                - option "Scanner Test Supplier 20260415145814"
            - generic [ref=e42]:
              - generic [ref=e43]: Delivery Date
              - textbox [ref=e44]
            - generic [ref=e45]:
              - generic [ref=e46]: PO Number
              - textbox "Optional purchase order number" [ref=e47]
            - button "Create Shipment" [ref=e49] [cursor=pointer]
        - generic [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e53]:
              - heading "Shipment List" [level=3] [ref=e54]
              - paragraph [ref=e55]: Filter shipments and select one for line management and receiving.
            - generic [ref=e56]:
              - textbox "Search by PO, supplier, shipment ID, status..." [ref=e57]
              - combobox [ref=e58]:
                - option "All statuses" [selected]
                - option "Pending"
                - option "Partial"
                - option "Received"
            - generic [ref=e59]:
              - 'button "PO-BARCODE-TEST-20260415182433 Shipment ID: d2eff186-0b72-4414-a88b-4a431e1def5c PENDING Supplier: Barcode Test Supplier 20260415182433 Delivery: 4/15/2026 QR: SHIPMENT-QR-20260415182433 Lines: 1 Ordered: 10 Received: 0" [ref=e60] [cursor=pointer]':
                - generic [ref=e61]:
                  - generic [ref=e62]:
                    - generic [ref=e63]: PO-BARCODE-TEST-20260415182433
                    - generic [ref=e64]: "Shipment ID: d2eff186-0b72-4414-a88b-4a431e1def5c"
                  - generic [ref=e65]: PENDING
                - generic [ref=e66]:
                  - generic [ref=e67]:
                    - strong [ref=e68]: "Supplier:"
                    - text: Barcode Test Supplier 20260415182433
                  - generic [ref=e69]:
                    - strong [ref=e70]: "Delivery:"
                    - text: 4/15/2026
                  - generic [ref=e71]:
                    - strong [ref=e72]: "QR:"
                    - text: SHIPMENT-QR-20260415182433
                  - generic [ref=e73]:
                    - strong [ref=e74]: "Lines:"
                    - text: "1"
                  - generic [ref=e75]:
                    - strong [ref=e76]: "Ordered:"
                    - text: "10"
                  - generic [ref=e77]:
                    - strong [ref=e78]: "Received:"
                    - text: "0"
              - 'button "PO-SCANNER-TEST-20260415145814 Shipment ID: 869bb78b-392a-4b39-ae6c-84cef7f3328a PENDING Supplier: Scanner Test Supplier 20260415145814 Delivery: 4/15/2026 QR: SCANNER-TEST-20260415145814 Lines: 1 Ordered: 10 Received: 0" [ref=e79] [cursor=pointer]':
                - generic [ref=e80]:
                  - generic [ref=e81]:
                    - generic [ref=e82]: PO-SCANNER-TEST-20260415145814
                    - generic [ref=e83]: "Shipment ID: 869bb78b-392a-4b39-ae6c-84cef7f3328a"
                  - generic [ref=e84]: PENDING
                - generic [ref=e85]:
                  - generic [ref=e86]:
                    - strong [ref=e87]: "Supplier:"
                    - text: Scanner Test Supplier 20260415145814
                  - generic [ref=e88]:
                    - strong [ref=e89]: "Delivery:"
                    - text: 4/15/2026
                  - generic [ref=e90]:
                    - strong [ref=e91]: "QR:"
                    - text: SCANNER-TEST-20260415145814
                  - generic [ref=e92]:
                    - strong [ref=e93]: "Lines:"
                    - text: "1"
                  - generic [ref=e94]:
                    - strong [ref=e95]: "Ordered:"
                    - text: "10"
                  - generic [ref=e96]:
                    - strong [ref=e97]: "Received:"
                    - text: "0"
              - 'button "DEMO-PO-1002 Shipment ID: e2f22d63-5156-40c4-9921-b93ca4ba5a8c PARTIAL Supplier: CleanCore Essentials Delivery: 4/10/2026 QR: DEMO-QR-1002 Lines: 3 Ordered: 30 Received: 9" [ref=e98] [cursor=pointer]':
                - generic [ref=e99]:
                  - generic [ref=e100]:
                    - generic [ref=e101]: DEMO-PO-1002
                    - generic [ref=e102]: "Shipment ID: e2f22d63-5156-40c4-9921-b93ca4ba5a8c"
                  - generic [ref=e103]: PARTIAL
                - generic [ref=e104]:
                  - generic [ref=e105]:
                    - strong [ref=e106]: "Supplier:"
                    - text: CleanCore Essentials
                  - generic [ref=e107]:
                    - strong [ref=e108]: "Delivery:"
                    - text: 4/10/2026
                  - generic [ref=e109]:
                    - strong [ref=e110]: "QR:"
                    - text: DEMO-QR-1002
                  - generic [ref=e111]:
                    - strong [ref=e112]: "Lines:"
                    - text: "3"
                  - generic [ref=e113]:
                    - strong [ref=e114]: "Ordered:"
                    - text: "30"
                  - generic [ref=e115]:
                    - strong [ref=e116]: "Received:"
                    - text: "9"
              - 'button "DEMO-PO-1001 Shipment ID: 72c8f3c4-b471-4d52-b2d9-57c1e9b2e3ba RECEIVED Supplier: BlueWave Beverages Delivery: 4/8/2026 QR: DEMO-QR-1001 Lines: 2 Ordered: 108 Received: 108" [ref=e117] [cursor=pointer]':
                - generic [ref=e118]:
                  - generic [ref=e119]:
                    - generic [ref=e120]: DEMO-PO-1001
                    - generic [ref=e121]: "Shipment ID: 72c8f3c4-b471-4d52-b2d9-57c1e9b2e3ba"
                  - generic [ref=e122]: RECEIVED
                - generic [ref=e123]:
                  - generic [ref=e124]:
                    - strong [ref=e125]: "Supplier:"
                    - text: BlueWave Beverages
                  - generic [ref=e126]:
                    - strong [ref=e127]: "Delivery:"
                    - text: 4/8/2026
                  - generic [ref=e128]:
                    - strong [ref=e129]: "QR:"
                    - text: DEMO-QR-1001
                  - generic [ref=e130]:
                    - strong [ref=e131]: "Lines:"
                    - text: "2"
                  - generic [ref=e132]:
                    - strong [ref=e133]: "Ordered:"
                    - text: "108"
                  - generic [ref=e134]:
                    - strong [ref=e135]: "Received:"
                    - text: "108"
              - 'button "DEMO-PO-1004 Shipment ID: 365496d9-73b2-4364-9ed0-37b747c319d4 RECEIVED Supplier: FreshRoute Foods Delivery: 4/12/2026 QR: DEMO-QR-1004 Lines: 3 Ordered: 44 Received: 44" [ref=e136] [cursor=pointer]':
                - generic [ref=e137]:
                  - generic [ref=e138]:
                    - generic [ref=e139]: DEMO-PO-1004
                    - generic [ref=e140]: "Shipment ID: 365496d9-73b2-4364-9ed0-37b747c319d4"
                  - generic [ref=e141]: RECEIVED
                - generic [ref=e142]:
                  - generic [ref=e143]:
                    - strong [ref=e144]: "Supplier:"
                    - text: FreshRoute Foods
                  - generic [ref=e145]:
                    - strong [ref=e146]: "Delivery:"
                    - text: 4/12/2026
                  - generic [ref=e147]:
                    - strong [ref=e148]: "QR:"
                    - text: DEMO-QR-1004
                  - generic [ref=e149]:
                    - strong [ref=e150]: "Lines:"
                    - text: "3"
                  - generic [ref=e151]:
                    - strong [ref=e152]: "Ordered:"
                    - text: "44"
                  - generic [ref=e153]:
                    - strong [ref=e154]: "Received:"
                    - text: "44"
              - 'button "DEMO-PO-1003 Shipment ID: b5ab774e-91e8-48b4-a19a-811e6990962e PENDING Supplier: Northwind Supply Co Delivery: 4/16/2026 QR: DEMO-QR-1003 Lines: 2 Ordered: 240 Received: 0" [ref=e155] [cursor=pointer]':
                - generic [ref=e156]:
                  - generic [ref=e157]:
                    - generic [ref=e158]: DEMO-PO-1003
                    - generic [ref=e159]: "Shipment ID: b5ab774e-91e8-48b4-a19a-811e6990962e"
                  - generic [ref=e160]: PENDING
                - generic [ref=e161]:
                  - generic [ref=e162]:
                    - strong [ref=e163]: "Supplier:"
                    - text: Northwind Supply Co
                  - generic [ref=e164]:
                    - strong [ref=e165]: "Delivery:"
                    - text: 4/16/2026
                  - generic [ref=e166]:
                    - strong [ref=e167]: "QR:"
                    - text: DEMO-QR-1003
                  - generic [ref=e168]:
                    - strong [ref=e169]: "Lines:"
                    - text: "2"
                  - generic [ref=e170]:
                    - strong [ref=e171]: "Ordered:"
                    - text: "240"
                  - generic [ref=e172]:
                    - strong [ref=e173]: "Received:"
                    - text: "0"
              - 'button "PO-NW-1001 Shipment ID: 8c2e3eb6-d4f3-4a5a-a7aa-5c07ab1b2590 RECEIVED Supplier: Northwind Supply Co Delivery: 4/8/2026 QR: SHIP-1775682928926-857547C0 Lines: 1 Ordered: 25 Received: 25" [ref=e174] [cursor=pointer]':
                - generic [ref=e175]:
                  - generic [ref=e176]:
                    - generic [ref=e177]: PO-NW-1001
                    - generic [ref=e178]: "Shipment ID: 8c2e3eb6-d4f3-4a5a-a7aa-5c07ab1b2590"
                  - generic [ref=e179]: RECEIVED
                - generic [ref=e180]:
                  - generic [ref=e181]:
                    - strong [ref=e182]: "Supplier:"
                    - text: Northwind Supply Co
                  - generic [ref=e183]:
                    - strong [ref=e184]: "Delivery:"
                    - text: 4/8/2026
                  - generic [ref=e185]:
                    - strong [ref=e186]: "QR:"
                    - text: SHIP-1775682928926-857547C0
                  - generic [ref=e187]:
                    - strong [ref=e188]: "Lines:"
                    - text: "1"
                  - generic [ref=e189]:
                    - strong [ref=e190]: "Ordered:"
                    - text: "25"
                  - generic [ref=e191]:
                    - strong [ref=e192]: "Received:"
                    - text: "25"
              - 'button "PO-1001 Shipment ID: 09dc4698-7f39-4280-b31d-3187044658da RECEIVED Supplier: FreshFoods Ltd Delivery: 4/8/2026 QR: SHIP-1775679376998-0723BCD3 Lines: 1 Ordered: 2 Received: 2" [ref=e193] [cursor=pointer]':
                - generic [ref=e194]:
                  - generic [ref=e195]:
                    - generic [ref=e196]: PO-1001
                    - generic [ref=e197]: "Shipment ID: 09dc4698-7f39-4280-b31d-3187044658da"
                  - generic [ref=e198]: RECEIVED
                - generic [ref=e199]:
                  - generic [ref=e200]:
                    - strong [ref=e201]: "Supplier:"
                    - text: FreshFoods Ltd
                  - generic [ref=e202]:
                    - strong [ref=e203]: "Delivery:"
                    - text: 4/8/2026
                  - generic [ref=e204]:
                    - strong [ref=e205]: "QR:"
                    - text: SHIP-1775679376998-0723BCD3
                  - generic [ref=e206]:
                    - strong [ref=e207]: "Lines:"
                    - text: "1"
                  - generic [ref=e208]:
                    - strong [ref=e209]: "Ordered:"
                    - text: "2"
                  - generic [ref=e210]:
                    - strong [ref=e211]: "Received:"
                    - text: "2"
              - 'button "No PO Number Shipment ID: ecd15708-5b2c-4c10-8715-0ebdb422055e RECEIVED Supplier: FreshFoods Ltd Delivery: 1/27/2026 QR: REORDER-1769533761778-2669 Lines: 1 Ordered: 15 Received: 0" [ref=e212] [cursor=pointer]':
                - generic [ref=e213]:
                  - generic [ref=e214]:
                    - generic [ref=e215]: No PO Number
                    - generic [ref=e216]: "Shipment ID: ecd15708-5b2c-4c10-8715-0ebdb422055e"
                  - generic [ref=e217]: RECEIVED
                - generic [ref=e218]:
                  - generic [ref=e219]:
                    - strong [ref=e220]: "Supplier:"
                    - text: FreshFoods Ltd
                  - generic [ref=e221]:
                    - strong [ref=e222]: "Delivery:"
                    - text: 1/27/2026
                  - generic [ref=e223]:
                    - strong [ref=e224]: "QR:"
                    - text: REORDER-1769533761778-2669
                  - generic [ref=e225]:
                    - strong [ref=e226]: "Lines:"
                    - text: "1"
                  - generic [ref=e227]:
                    - strong [ref=e228]: "Ordered:"
                    - text: "15"
                  - generic [ref=e229]:
                    - strong [ref=e230]: "Received:"
                    - text: "0"
              - 'button "No PO Number Shipment ID: be947875-d367-4cd2-b908-d54a5615fc61 PENDING Supplier: FreshFoods Ltd Delivery: 1/27/2026 QR: REORDER-1769533422252-2783 Lines: 1 Ordered: 5 Received: 0" [ref=e231] [cursor=pointer]':
                - generic [ref=e232]:
                  - generic [ref=e233]:
                    - generic [ref=e234]: No PO Number
                    - generic [ref=e235]: "Shipment ID: be947875-d367-4cd2-b908-d54a5615fc61"
                  - generic [ref=e236]: PENDING
                - generic [ref=e237]:
                  - generic [ref=e238]:
                    - strong [ref=e239]: "Supplier:"
                    - text: FreshFoods Ltd
                  - generic [ref=e240]:
                    - strong [ref=e241]: "Delivery:"
                    - text: 1/27/2026
                  - generic [ref=e242]:
                    - strong [ref=e243]: "QR:"
                    - text: REORDER-1769533422252-2783
                  - generic [ref=e244]:
                    - strong [ref=e245]: "Lines:"
                    - text: "1"
                  - generic [ref=e246]:
                    - strong [ref=e247]: "Ordered:"
                    - text: "5"
                  - generic [ref=e248]:
                    - strong [ref=e249]: "Received:"
                    - text: "0"
              - 'button "No PO Number Shipment ID: 6667494a-be48-4687-9217-9dcb55c7b0d7 PARTIAL Supplier: FreshFoods Ltd Delivery: 1/26/2026 QR: ALPHA-SHIP-001 Lines: 2 Ordered: 46 Received: 0" [ref=e250] [cursor=pointer]':
                - generic [ref=e251]:
                  - generic [ref=e252]:
                    - generic [ref=e253]: No PO Number
                    - generic [ref=e254]: "Shipment ID: 6667494a-be48-4687-9217-9dcb55c7b0d7"
                  - generic [ref=e255]: PARTIAL
                - generic [ref=e256]:
                  - generic [ref=e257]:
                    - strong [ref=e258]: "Supplier:"
                    - text: FreshFoods Ltd
                  - generic [ref=e259]:
                    - strong [ref=e260]: "Delivery:"
                    - text: 1/26/2026
                  - generic [ref=e261]:
                    - strong [ref=e262]: "QR:"
                    - text: ALPHA-SHIP-001
                  - generic [ref=e263]:
                    - strong [ref=e264]: "Lines:"
                    - text: "2"
                  - generic [ref=e265]:
                    - strong [ref=e266]: "Ordered:"
                    - text: "46"
                  - generic [ref=e267]:
                    - strong [ref=e268]: "Received:"
                    - text: "0"
          - generic [ref=e269]:
            - generic [ref=e271]:
              - heading "Selected Shipment" [level=3] [ref=e272]
              - paragraph [ref=e273]: Add shipment lines, receive stock into locations, and finalize the shipment.
            - paragraph [ref=e274]: Select a shipment to continue.
```

# Test source

```ts
  127 |   const lineCandidates = main
  128 |     .locator('section, article, div, tr')
  129 |     .filter({ hasText: /ordered|received|remaining|product/i });
  130 | 
  131 |   if ((await lineCandidates.count()) === 0) {
  132 |     return false;
  133 |   }
  134 | 
  135 |   const firstLine = lineCandidates.first();
  136 |   const lineButtons = firstLine.getByRole('button', { name: /receive|save|submit|confirm/i });
  137 | 
  138 |   if ((await lineButtons.count()) > 0) {
  139 |     await lineButtons.first().click();
  140 |     return true;
  141 |   }
  142 | 
  143 |   return false;
  144 | }
  145 | 
  146 | async function fillReceiveForm(surface: Locator): Promise<void> {
  147 |   const selects = surface.locator('select');
  148 |   const selectCount = await selects.count();
  149 | 
  150 |   for (let i = 0; i < selectCount; i += 1) {
  151 |     const select = selects.nth(i);
  152 | 
  153 |     if (!(await select.isVisible())) {
  154 |       continue;
  155 |     }
  156 | 
  157 |     const optionValues = await select.locator('option').evaluateAll((options) =>
  158 |       options
  159 |         .map((option) => ({
  160 |           value: (option as HTMLOptionElement).value,
  161 |           disabled: (option as HTMLOptionElement).disabled
  162 |         }))
  163 |         .filter((option) => option.value && !option.disabled)
  164 |         .map((option) => option.value)
  165 |     );
  166 | 
  167 |     if (optionValues.length > 0) {
  168 |       await select.selectOption(optionValues[0]);
  169 |     }
  170 |   }
  171 | 
  172 |   const numberInputs = surface.locator('input[type="number"]');
  173 |   const numberInputCount = await numberInputs.count();
  174 | 
  175 |   for (let i = 0; i < numberInputCount; i += 1) {
  176 |     const input = numberInputs.nth(i);
  177 | 
  178 |     if (await input.isVisible()) {
  179 |       await input.fill('1');
  180 |     }
  181 |   }
  182 | 
  183 |   const textInputs = surface.locator('input[type="text"], textarea');
  184 |   const textInputCount = await textInputs.count();
  185 | 
  186 |   for (let i = 0; i < textInputCount; i += 1) {
  187 |     const input = textInputs.nth(i);
  188 | 
  189 |     if (!(await input.isVisible())) {
  190 |       continue;
  191 |     }
  192 | 
  193 |     const currentValue = await input.inputValue().catch(() => '');
  194 | 
  195 |     if (!currentValue) {
  196 |       await input.fill('E2E shipment receive verification');
  197 |     }
  198 |   }
  199 | }
  200 | 
  201 | async function submitReceive(surface: Locator): Promise<boolean> {
  202 |   const submitButtons = [
  203 |     surface.getByRole('button', { name: /^receive$/i }).first(),
  204 |     surface.getByRole('button', { name: /save|submit|confirm/i }).first()
  205 |   ];
  206 | 
  207 |   for (const button of submitButtons) {
  208 |     if ((await button.count()) > 0 && (await button.isVisible()) && !(await button.isDisabled())) {
  209 |       await button.click();
  210 |       return true;
  211 |     }
  212 |   }
  213 | 
  214 |   return false;
  215 | }
  216 | 
  217 | test.describe('shipment receive execution', () => {
  218 |   test('authorized user can execute one shipment receive flow', async ({ page, request }) => {
  219 |     await bootstrapAuthenticatedPage(page, request);
  220 | 
  221 |     await page.goto('/shipments');
  222 | 
  223 |     const main = await getMain(page);
  224 | 
  225 |     await selectFirstOperationalShipment(main);
  226 | 
> 227 |     await expect(main).not.toContainText(/Select a shipment to continue\./i);
      |                            ^ Error: expect(locator).not.toContainText(expected) failed
  228 |     await expect(main).toContainText(/Selected Shipment|Shipment Items/i);
  229 |     await expect(main).toContainText(/Default Scan Location/i);
  230 | 
  231 |     const locationSelected = await selectDefaultScanLocation(main);
  232 | 
  233 |     if (!locationSelected) {
  234 |       return;
  235 |     }
  236 | 
  237 |     const scanButton = main.getByRole('button', { name: /scan/i }).first();
  238 |     await expect(scanButton).toBeEnabled();
  239 | 
  240 |     const receiveOpened = await openReceiveAction(main);
  241 | 
  242 |     if (!receiveOpened) {
  243 |       test.fail(true, 'No shipment receive action was available for the selected shipment.');
  244 |       return;
  245 |     }
  246 | 
  247 |     const surface = await getReceiveSurface(page);
  248 | 
  249 |     await expect(surface).toContainText(/receive|quantity|location|product/i);
  250 | 
  251 |     await fillReceiveForm(surface);
  252 | 
  253 |     const submitted = await submitReceive(surface);
  254 | 
  255 |     if (!submitted) {
  256 |       test.fail(true, 'No enabled submit button was available for shipment receive.');
  257 |       return;
  258 |     }
  259 | 
  260 |     await expect(page).toHaveURL(/\/shipments$/);
  261 |     await expect(page.locator('h1')).toContainText(/Shipments/i);
  262 |     await expect(main).toContainText(/Selected Shipment|Shipment Items/i);
  263 | 
  264 |     await expect(page.locator('body')).toContainText(
  265 |       /success|updated|saved|recorded|received|shipment items/i
  266 |     );
  267 |   });
  268 | });
```