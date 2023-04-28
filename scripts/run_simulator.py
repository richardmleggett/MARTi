#!/usr/bin/python

import sys, getopt, errno, time, gzip
from pathlib import Path

tempFilename = "./temp.fq"
timeBetweenChunks = 1
chunkSize = 4000
gzipPass = False
gzipFail = False

inputDir = None
outputDir = None

def print_help():
	print("run_simulator.py -i <input dir> -o <output dir> -c <chunk size> -t <time between chunks>")
	print("\t <input dir> \t\t Nanopore run directory to simulate.")
	print("\t <output dir> \t\t New directory for simulate runs (will create if doesn't exist).")
	print("\t <chunk size> \t\t Number of reads per file in simulated run.")
	print("\t <time between chunks> \t Time to wait between writing output files (in minutes).")

try:
	opts, args = getopt.getopt(sys.argv[1:],"hi:o:c:t:")
except getopt.GetoptError:
	print("Option not recognised.")
	print_help()
	sys.exit(2)
for opt, arg in opts:
	if opt == "-h":
		print_help()
		sys.exit()
	elif opt in ("-i"):
		inputDir = arg
	elif opt in ("-o"):
		outputDir = arg
	elif opt in ("-c"):
		chunkSize = int(arg)
	elif opt in ("-t"):
		timeBetweenChunks = float(arg) * 60

if not inputDir:
	print("Error: You must specify -i")
	print_help()
	sys.exit(2)
else:
	if not Path(inputDir).is_dir():
		print("Error: Input directory " + inputDir + " does not exist.")
		sys.exit(2)
if not outputDir:
	print("Error: You must specify -o")
	print_help()
	sys.exit(2)

fastqPassList = []
fastqFailList = []

print("[run_simulator.py] Read directory: " + inputDir)
for path in Path(inputDir).rglob('fastq_pass/*.fastq'):
    fastqPassList.append(path)

if len(fastqPassList) == 0:
	for path in Path(inputDir).rglob('fastq_pass/*.fastq.gz'):
	  	fastqPassList.append(path)
	gzipPass = True

if len(fastqPassList) == 0:
	print("Error: Could not find fastq files in directory " + inputDir)
	sys.exit(2)

for path in Path(inputDir).rglob('fastq_fail/*.fastq'):
    fastqFailList.append(path)
if len(fastqFailList) == 0:
	for path in Path(inputDir).rglob('fastq_fail/*.fastq.gz'):
		fastqFailList.append(path)
	gzipFail = True

fastqPassList.sort(key=lambda p: int(p.name.split("_")[-1].split(".")[0]), reverse=False)
fastqFailList.sort(key=lambda p: int(p.name.split("_")[-1].split(".")[0]), reverse=False)

# Make new directory structure
Path(outputDir).mkdir(parents=True, exist_ok=True)
for path in Path(inputDir).rglob('*/'):
	if path.is_dir() :
		Path(outputDir + "/" + path.as_posix().replace(inputDir, '')).mkdir(parents=True, exist_ok=True)
		if path.name == "fastq_pass":
			fastqPassOutputDir = outputDir + "/" + path.as_posix().replace(inputDir, '')
			for fastq in Path(fastqPassOutputDir).glob("simulator_pass_chunk_*.fastq"):
				fastq.unlink()
		elif path.name == "fastq_fail":
			fastqFailOutputDir = outputDir + "/" + path.as_posix().replace(inputDir, '')
			for fastq in Path(fastqFailOutputDir).glob("simulator_fail_chunk_*.fastq"):
				fastq.unlink()

assert(fastqPassOutputDir != '')

with open(tempFilename, 'w') as outfile:
	for filename in fastqPassList:
		if gzipPass:
			with gzip.open(filename.as_posix(), 'rt') as infile:
				outfile.write(infile.read())
		else:
			with open(filename.as_posix(), 'r') as infile:
				outfile.write(infile.read())
chunkNumber = 0
with open(tempFilename, 'r') as infile:
	lineNumber = 0
	f = open(fastqPassOutputDir + "/simulator_pass_chunk_0.fastq", "w")
	for line in infile:
		if lineNumber != 0 and (lineNumber / 4) % chunkSize == 0:
			f.close()
			print("[run_simulator.py] Writing pass chunk " + str(chunkNumber) + " to " + fastqPassOutputDir + "/simulator_pass_chunk_" + str(chunkNumber) + ".fastq")
			time.sleep(timeBetweenChunks)
			chunkNumber += 1
			f = open(fastqPassOutputDir + "/simulator_pass_chunk_" + str(chunkNumber) + ".fastq", "w")
		f.write(line)
		lineNumber += 1
	print("[run_simulator.py] Writing pass chunk " + str(chunkNumber) + " to " + fastqPassOutputDir + "/simulator_pass_chunk_" + str(chunkNumber) + ".fastq")
	f.close()
p = Path(tempFilename)
p.unlink()

if len(fastqFailList) > 0:
	print("[run_simulator.py] Writing fail chunks...")
	with open(tempFilename, 'w') as outfile:
		for filename in fastqFailList:
			if gzipFail:
				with gzip.open(filename.as_posix(), 'rt') as infile:
					outfile.write(infile.read())
			else:
				with open(filename.as_posix(), 'r') as infile:
					outfile.write(infile.read())
	chunkNumber = 0
	with open(tempFilename, 'r') as infile:
		lineNumber = 0
		f = open(fastqFailOutputDir + "/simulator_fail_chunk_0.fastq", "w")
		for line in infile:
			if lineNumber != 0 and (lineNumber / 4) % chunkSize == 0:
				f.close()
				chunkNumber += 1
				f = open(fastqFailOutputDir + "/simulator_fail_chunk_" + str(chunkNumber) + ".fastq", "w")
			f.write(line)
			lineNumber += 1
		f.close()
	p = Path(tempFilename)
	p.unlink()
