{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.pkgconfig
    pkgs.cairo
    pkgs.pango
    pkgs.libjpeg
    pkgs.glib
    pkgs.gdk-pixbuf
    pkgs.fontconfig
    pkgs.pixman
    pkgs.freetype
    pkgs.libuuid
    pkgs.gifsicle
    pkgs.librsvg
  ];
}
