# Inventory Transaction Design

## 1. Cơ cấu Dữ liệu
Để đảm bảo tính toàn vẹn và dễ dàng đối soát kho, hệ thống giới thiệu thực thể `InventoryTransaction` để ghi nhận toàn bộ biến động kho:

```prisma
enum InventoryTransactionType {
  ISSUE            // Xuất kho cho phiếu bảo trì
  RETURN           // Hoàn trả vật tư dư thừa về kho từ phiếu bảo trì
  ADJUSTMENT_IN    // Nhập kho điều chỉnh (kiểm kho, bổ sung hàng)
  ADJUSTMENT_OUT   // Xuất kho điều chỉnh (thất thoát, hỏng hóc)
}

model InventoryTransaction {
  id              String                   @id @default(uuid())
  inventoryItemId String
  inventoryItem   InventoryItem            @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  workOrderId     String?
  workOrder       WorkOrder?               @relation(fields: [workOrderId], references: [id], onDelete: SetNull)
  workOrderItemId String?                  // Liên kết với dòng vật tư của Work Order
  transactionType InventoryTransactionType
  quantity        Int
  unitPrice       Float
  totalAmount     Float
  quantityBefore  Int
  quantityAfter   Int
  createdAt       DateTime                 @default(now())
  reference       String?
}
```

---

## 2. Ràng buộc Chống Xuất kho trùng lặp (Double Issue Prevention)
Hệ thống áp dụng các ràng buộc nghiệp vụ và database sau:
1.  **Ràng buộc duy nhất tại Database:**
    ```prisma
    @@unique([workOrderItemId, transactionType])
    ```
    *   **Giải thích nghiệp vụ:** Ràng buộc này đảm bảo một `WorkOrderItem` (dòng khai báo sử dụng vật tư của phiếu WO) chỉ được phép có tối đa **một** giao dịch xuất kho (`ISSUE`).
    *   **Khả năng hoàn trả:** Nếu có phát sinh hoàn trả vật tư thừa, hệ thống sẽ tạo một bản ghi `InventoryTransaction` mới có kiểu `RETURN` liên kết với `workOrderItemId` đó. Do ràng buộc là sự kết hợp của `(workOrderItemId, transactionType)`, việc có đồng thời một dòng `ISSUE` và một dòng `RETURN` cho cùng một `workOrderItemId` là hoàn toàn hợp lệ.
    *   **Xử lý giá trị Nullable:** Đối với các giao dịch điều chỉnh kho tự do (`ADJUSTMENT_IN`, `ADJUSTMENT_OUT`), trường `workOrderItemId` sẽ mang giá trị `null`. Cả SQLite và MySQL đều coi các giá trị `null` trong chỉ mục unique là độc lập (`NULL != NULL`), do đó cho phép tạo vô số bản ghi điều chỉnh kho tự do mà không gặp lỗi trùng lặp.

2.  **Logic kiểm tra tại tầng Service:**
    Trước khi tạo bất kỳ giao dịch `ISSUE` nào, Service sẽ kiểm tra trong bảng `InventoryTransaction` xem đã tồn tại bản ghi nào có cùng `workOrderItemId` và `transactionType: ISSUE` chưa. Nếu có, giao dịch sẽ bị từ chối lập tức ở mức ứng dụng.
