import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_dashboard_grid_responsive.js...");

    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // 1. Target the CSS block from "/* ─── Grid Menu on Home Page ─── */" down to just before "/* Responsive Layout Rules */"
    const old_css_block = `        /* ─── Grid Menu on Home Page ─── */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }

        .menu-card {
            background: linear-gradient(135deg, rgba(41,27,21,0.90) 0%, rgba(26,17,13,0.95) 100%);
            border: 1.5px solid var(--border);
            border-radius: 20px;
            padding: 24px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        .menu-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,122,31,0.08) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .menu-card:hover {
            transform: translateY(-6px);
            border-color: var(--orange);
            box-shadow: 0 10px 25px rgba(255, 122, 31, 0.15);
        }

        .menu-card:hover::before {
            opacity: 1;
        }

        .menu-card-icon {
            width: 60px;
            height: 60px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #fff;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        }

        .menu-card:hover .menu-card-icon {
            transform: scale(1.1) rotate(5deg);
        }

        .menu-card-title {
            font-size: 15px;
            font-weight: 800;
            color: #fff;
            margin: 0;
            font-family: 'Cairo', sans-serif;
        }

        .menu-card-desc {
            font-size: 11px;
            color: #8B909E;
            margin: 0;
            line-height: 1.4;
            font-family: 'Cairo', sans-serif;
        }

        /* Responsive Mobile Columns (2 Columns just like user's screenshot) */
        @media (max-width: 576px) {
            .dashboard-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            .menu-card {
                padding: 16px 10px;
                border-radius: 16px;
                gap: 8px;
            }
            .menu-card-icon {
                width: 50px;
                height: 50px;
                font-size: 20px;
                border-radius: 14px;
            }
            .menu-card-title {
                font-size: 13px;
            }
            .menu-card-desc {
                font-size: 10px;
            }
        }`;

    const new_css_block = `        /* ─── Grid Menu on Home Page ─── */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr); /* 4 columns on large screens */
            gap: 20px;
            margin-top: 25px;
        }

        .menu-card {
            background: linear-gradient(135deg, rgba(41,27,21,0.90) 0%, rgba(26,17,13,0.95) 100%);
            border: 1.5px solid var(--border);
            border-radius: 20px;
            padding: 24px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        .menu-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,122,31,0.08) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .menu-card:hover {
            transform: translateY(-6px);
            border-color: var(--orange);
            box-shadow: 0 10px 25px rgba(255, 122, 31, 0.15);
        }

        .menu-card:hover::before {
            opacity: 1;
        }

        .menu-card-icon {
            width: 60px;
            height: 60px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #fff;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        }

        .menu-card:hover .menu-card-icon {
            transform: scale(1.1) rotate(5deg);
        }

        .menu-card-title {
            font-size: 15px;
            font-weight: 800;
            color: #fff;
            margin: 0;
            font-family: 'Cairo', sans-serif;
        }

        .menu-card-desc {
            font-size: 11px;
            color: #8B909E;
            margin: 0;
            line-height: 1.4;
            font-family: 'Cairo', sans-serif;
        }

        @media (max-width: 1200px) {
            .dashboard-grid {
                grid-template-columns: repeat(3, 1fr); /* 3 columns on tablet/laptops */
                gap: 16px;
            }
        }

        /* Responsive Mobile Columns (2 Columns just like user's screenshot) */
        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: repeat(2, 1fr); /* 2 columns on mobile devices */
                gap: 12px;
            }
            .menu-card {
                padding: 16px 10px;
                border-radius: 16px;
                gap: 8px;
            }
            .menu-card-icon {
                width: 50px;
                height: 50px;
                font-size: 20px;
                border-radius: 14px;
            }
            .menu-card-title {
                font-size: 13px;
            }
            .menu-card-desc {
                font-size: 10px;
            }
        }`;

    if (htmlContent.includes(old_css_block)) {
        htmlContent = htmlContent.replace(old_css_block, new_css_block);
        fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
        console.log("SUCCESS: admin.html responsive media queries updated!");
    } else {
        console.log("ERROR: old CSS block not matched in admin.html!");
    }
}

main();
