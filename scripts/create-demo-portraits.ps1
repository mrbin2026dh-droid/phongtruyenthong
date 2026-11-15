# Tạo ảnh minh họa hình học, không mô phỏng người thật. Chạy tại thư mục website.
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path public/portraits -Force | Out-Null
$palette=@('#49768b','#84727d','#4d766b','#64728b','#9a805f','#55677e')
for($i=0;$i -le 12;$i++){
 $height=if($i % 2 -eq 0){400}else{450}
 $bmp=[Drawing.Bitmap]::new(300,$height)
 $g=[Drawing.Graphics]::FromImage($bmp)
 $g.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $g.Clear([Drawing.ColorTranslator]::FromHtml('#e6dfd0'))
 $bg=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($palette[$i % 6]))
 $g.FillRectangle($bg,12,12,276,($height-24))
 $skin=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#d6b49a'))
 $hair=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#343333'))
 $shirt=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#ece7dd'))
 $jacket=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#20374c'))
 $g.FillEllipse($hair,91,65,118,142)
 $g.FillEllipse($skin,100,84,100,127)
 $g.FillRectangle($skin,130,196,40,36)
 $g.FillEllipse($jacket,39,225,222,260)
 $pts=[Drawing.Point[]]@([Drawing.Point]::new(113,225),[Drawing.Point]::new(187,225),[Drawing.Point]::new(150,353))
 $g.FillPolygon($shirt,$pts)
 $pen=[Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#725c4a'),3)
 $g.DrawArc($pen,131,162,38,25,10,160)
 $g.FillEllipse($hair,120,137,6,5);$g.FillEllipse($hair,174,137,6,5)
 $g.FillRectangle($jacket,12,($height-50),276,38)
 $font=[Drawing.Font]::new('Arial',11,[Drawing.FontStyle]::Bold)
 $g.DrawString('MINH HOA - DU LIEU MAU',$font,[Drawing.Brushes]::White,35,($height-41))
 $name=if($i -eq 0){'default'}else{'GV'+$i.ToString('000')}
 $bmp.Save((Join-Path (Get-Location) "public/portraits/$name.jpg"),[Drawing.Imaging.ImageFormat]::Jpeg)
 foreach($resource in @($g,$bmp,$bg,$skin,$hair,$shirt,$jacket,$pen,$font)){$resource.Dispose()}
}

