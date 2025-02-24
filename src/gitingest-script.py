from gitingest import ingest
import sys
import json

repo = sys.argv[1]
summary, tree, content = ingest(repo)

output = {
    'summary': summary,
    'tree': tree,
    'content': content
}

print(json.dumps(output))
