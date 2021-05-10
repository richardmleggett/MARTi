.. _virtualbox:

Using the VirtualBox image
==========================

You can download a VirtualBox image from `EI's opendata
site <https://opendata.earlham.ac.uk/opendata/nanook/>`__. This is a complete virtual
computer system that includes an Ubuntu operating system, NanoOK, all
the dependencies and an example data set.

**NOTE: Currently, this image only includes the LAST aligner. If you
wish to use an alternative aligner, you will need to download that to
the VM. In future releases, we hope to include other alignment tools.**

-  To run it, you will need to have installed the free VirtualBox
   software - it's available from
   `virtualbox.org <https://www.virtualbox.org>`__.
-  When you start the image, it will boot into an Ubuntu desktop. You
   can click on the Terminal icon on the left hand side and start typing
   commands.
-  The screen display is quite small - this is because Oracle (owners of
   VirtualBox) do not license users to distribute additional components
   known as the "Guest Additions". However, you can download this for
   free and install it yourself - see `the VirtualBox manual for
   details <https://www.virtualbox.org/manual/ch04.html#idp95340944>`__.
-  You also need to install the Guest Additions before you can share
   folders with the host operating system.
-  There is one user setup called 'nanook' and the password is also
   'nanook'.

To run the example dataset (consisting of only 500 reads) with NanoOK,
do the following:

#. Start the VirtualBox image.
#. Open a terminal and type::

     cd ~/Documents/NanoOK\_Example

#. To index the reference, type::

     cd references
     lastdb -Q 0 ecoli\_dh10b\_cs ecoli\_dh10b\_cs.fasta
     cd ..

#. To extract, type::

     nanook extract -s N79596\_dh10b\_8kb\_11022015 -t 2

#. To align, type::

     nanook align -s N79596\_dh10b\_8kb\_11022015 -r references/ecoli\_dh10b\_cs.fasta -t 2

#. To analyse, type::

     nanook analyse -s N79596\_dh10b\_8kb\_11022015 -r references/ecoli\_dh10b\_cs.fasta -passonly -t 2

#. To view the PDF, use the "Files" icon in the left-hand toolbar of the
   Ubuntu desktop and browse to
   Documents->NanoOK\_Example->N79596\_dh10b\_8kb\_11022015->latex\_last\_passonly
   and double-click on the PDF file. Note, that as this example consists
   of such a small number of reads, the graphs will not be quite as
   informative as for a full dataset.

When new versions of NanoOK are released, you don't need to download
another VM image. Instead type the following inside a Terminal window to
install the latest version::

  cd ~/Documents/NanoOK
  git pull
