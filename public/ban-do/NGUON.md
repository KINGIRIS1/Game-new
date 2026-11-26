# Nguồn hình bản đồ Việt Nam

`34-tinh.json` (TopoJSON, 34 tỉnh, thành từ 2025) rút gọn từ:

- **Free-GIS-Data** của nguyenduy1133: https://github.com/nguyenduy1133/Free-GIS-Data
  - `Vietnam Administrative Divisions (Post-2025) - Đơn vị hành chính Việt Nam (Từ 2025)/Provinces.geojson`: 34 tỉnh, có quần đảo Hoàng Sa (thuộc Đà Nẵng) và Trường Sa (thuộc Khánh Hòa).
  - `Vietnam Administrative Divisions (Pre-2025) - Đơn vị hành chính Việt Nam (Trước 2025)/Provinces_included_Paracel_SpratlyIslands.geojson`: chỉ lấy các đảo Côn Đảo của Bà Rịa - Vũng Tàu (tệp 34 tỉnh thiếu), gộp vào TP. Hồ Chí Minh.
- Repo nguồn không có tệp giấy phép, chỉ yêu cầu ghi nguồn. Nguồn cũng ghi ở Cài đặt trong game và trong trường `nguon` của tệp JSON.

Đã sửa: đối tượng mã `31` tệp nguồn ghi nhầm tên "Lạng Sơn" (Lạng Sơn thật là mã `11`), khung bao ở 105,2–106,8° Đông, 10,1–11,0° Bắc: đổi thành **Đồng Tháp**.

Rút gọn: bỏ đảo dưới 2 km² (trừ đảo trong hai quần đảo), giữ chừng 8% điểm (cạnh chung rút gọn một lần nên các tỉnh vẫn khít), lượng tử 20 000 nấc. Dựng lại: `node scripts/ban-do.mjs <Provinces.geojson> <Provinces_included_Paracel_SpratlyIslands.geojson>` (cách lấy tệp ghi ở đầu script). Script cũng ghi láng giềng, viền ngoài, số đảo vào `src/game/vietNamHinh.ts`.
