
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 1. KẾT NỐI SUPABASE
const SUPABASE_URL = "https://qnbahmezqoqhfwjkhjfl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nLAnTtBInOaUA2hhRWzjLQ_tARr1KS7";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. LẤY CÁC PHẦN TỬ HTML
const fileInput = document.getElementById("files");
const gallery = document.getElementById("gallery");
const empty = document.getElementById("empty");

const viewer = document.getElementById("viewer");
const bigImage = document.getElementById("bigImage");
const bigCaption = document.getElementById("bigCaption");
const bigDate = document.getElementById("bigDate");

// 3. ĐỊNH DẠNG NGÀY
function formatDate(dateString) {
    if (!dateString) return "Vừa mới tải lên";

    return new Date(dateString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

// 4. HIỂN THỊ ẢNH
function render(photos) {
    gallery.innerHTML = "";

    if (!photos || photos.length === 0) {
        empty.style.display = "block";
        return;
    }

    empty.style.display = "none";

    photos.forEach((photo) => {
        const item = document.createElement("div");
        item.className = "photo-item";

        const img = document.createElement("img");
        img.src = photo.image_url;
        img.alt = photo.title || "Memory";

        const caption = document.createElement("p");
        caption.textContent = photo.title || "Một kỷ niệm";

        const date = document.createElement("small");
        date.textContent = formatDate(photo.created_at);

        item.appendChild(img);
        item.appendChild(caption);
        item.appendChild(date);

        item.addEventListener("click", () => openViewer(photo));

        gallery.appendChild(item);
    });
}

// 5. LẤY ẢNH TỪ SUPABASE
async function loadPhotos() {
    const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Lỗi tải danh sách ảnh:", error);
        empty.textContent = "Không thể tải thư viện ảnh. Vui lòng thử lại.";
        empty.style.display = "block";
        return;
    }

    render(data);
}

// 6. TẢI ẢNH LÊN KHO CHUNG
fileInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    for (const file of files) {
        if (!file.type.startsWith("image/")) {
            alert(`"${file.name}" không phải là ảnh!`);
            continue;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert(`Ảnh "${file.name}" vượt quá 5 MB!`);
            continue;
        }

        let storagePath = null;

        try {
            // Tạo tên file an toàn, không dấu cách, không ký tự đặc biệt
            const extension = file.name.split(".").pop().toLowerCase();
            const safeExtension = extension.replace(/[^a-z0-9]/g, "");

            if (!safeExtension) {
                throw new Error("Không xác định được định dạng ảnh.");
            }

            const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
            storagePath = `uploads/${fileName}`;

            // Tải ảnh lên Storage
            const { error: uploadError } = await supabase
                .storage
                .from("photos")
                .upload(storagePath, file, {
                    contentType: file.type,
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Lấy URL công khai
            const { data: urlData } = supabase
                .storage
                .from("photos")
                .getPublicUrl(storagePath);

            const imageUrl = urlData.publicUrl;

            // Lưu thông tin vào Database
            const { error: insertError } = await supabase
                .from("photos")
                .insert({
                    title: file.name,
                    image_url: imageUrl,
                    storage_path: storagePath
                });

            if (insertError) throw insertError;

            console.log("Đã tải ảnh thành công:", file.name);

        } catch (error) {
            console.error("Chi tiết lỗi tải ảnh:", error);

            // Nếu lưu Database thất bại thì xóa ảnh đã tải lên
            if (storagePath) {
                await supabase.storage
                    .from("photos")
                    .remove([storagePath]);
            }

            alert(`Không thể tải ảnh "${file.name}": ${error.message || "Lỗi không xác định"}`);
        }
    }

    await loadPhotos();
    fileInput.value = "";
});

// 7. MỞ ẢNH LỚN
function openViewer(photo) {
    bigImage.src = photo.image_url;
    bigCaption.textContent = photo.title || "Một kỷ niệm";
    bigDate.textContent = formatDate(photo.created_at);
    viewer.style.display = "flex";
}

// 8. ĐÓNG ẢNH LỚN
function closeViewer() {
    viewer.style.display = "none";
    bigImage.src = "";
}

window.openViewer = openViewer;
window.closeViewer = closeViewer;

// 9. HIỆU ỨNG SAO
const canvas = document.getElementById("stars");

if (canvas) {
    const ctx = canvas.getContext("2d");
    let stars = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        stars = [];

        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2,
                alpha: Math.random()
            });
        }
    }

    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach((star) => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
            ctx.fill();

            star.alpha += (Math.random() - 0.5) * 0.05;
            star.alpha = Math.max(0.2, Math.min(1, star.alpha));
        });

        requestAnimationFrame(drawStars);
    }

    resizeCanvas();
    drawStars();
    window.addEventListener("resize", resizeCanvas);
}

// 10. KHỞI ĐỘNG WEBSITE
loadPhotos();
