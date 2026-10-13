// various import
import { useFetch } from "@raycast/utils";
import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	List,
	showToast,
	Toast,
	Color,
	useNavigation
} from "@vicinae/api";
import {
	useEffect,
	useState
} from 'react';
import TurndownService, * as Turndown from "turndown"
// Turndownservice initialisation (to be able to transform html to markdown)
var turndownService = new TurndownService({codeBlockStyle: `fenced`})
var tables = require('turndown-plugin-gfm').tables

turndownService.use(tables)
turndownService.remove(function (node){
	return node.getAttribute('class') === 'mw-editsection-bracket'
}).remove(function (node){
	return node.getAttribute('class') === 'mw-editsection'
})
/*turndownService.addRule('codeIndent',{
	filter: ['pre','code'],
	replacement: function(content){
		return '```\n' + content + '```\n'
	}
})
*/
// custom interface to match Arch Wiki's response
interface SearchResult {
	query: string;
	titles: string[];
	description: string[];
	urls: string[];
}	

interface PageResult {
	 "parse":{
		title: string,
		pageid: number,
		redirects: string[],
		"text":{
			"*" : string
		}

	}
}

// Function to get a wiki page from it's title
function useWikiPage(title:string|undefined){
let doWeExecute : boolean = true
if (title == undefined){
	doWeExecute = false
}
if (title?.length ==0){
	doWeExecute = false
}
const {isLoading,data,revalidate,error} = useFetch<PageResult>(`https://wiki.archlinux.org/api.php?action=parse&page=${encodeURIComponent(title ?? "")}&format=json&prop=text&redirects=1`,{execute:doWeExecute,redirect:'follow',async onError(error){await showToast({title:"Failed to fetch wiki page",style:Toast.Style.Failure,message:String(error)})}, async onData(){await showToast({title:"Wiki page fetched successfully",style:Toast.Style.Success})}})
let returnData : string|undefined
if (data){
	returnData = data?.parse?.text?.["*"]
}
return {
	wikiPage:returnData ?? "",
	isLoading: isLoading,
	revalidate:revalidate,
	error:error
}
}
function useSearchWikiPage(searchTerm: string) {
	const defaultOuput = {} as SearchResult;
	defaultOuput.query =""
	defaultOuput.titles = []
	defaultOuput.description = []
	defaultOuput.urls = []
	const [wikiSearch, setWikiSearch] = useState<SearchResult>(defaultOuput)

	useEffect(() => {
		const controller = new AbortController();
		if (searchTerm.length == 0){
			setWikiSearch(defaultOuput)
			return () => controller.abort()
		}
		const timeout = setTimeout(async () =>{
		// Toast so that user know to wait
		const toast = await showToast({ title: "Searching...", style: Toast.Style.Animated })
		const archWikiUrlRegexMarch = searchTerm.match(/^(https:\/\/)?(wiki.archlinux.org\/title\/)(.*)/)
		// Regex to check if an Arch Wiki url was pasted, if yes only take the title

		if (archWikiUrlRegexMarch){
			searchTerm=archWikiUrlRegexMarch[3]
		}
		
		let urlEncodedSearchTerm = encodeURIComponent(searchTerm)
		fetch(`https://wiki.archlinux.org/api.php?action=opensearch&search=${urlEncodedSearchTerm}&list=search`,{signal: controller.signal}).then((response) => {
			if (!response.ok){
				//Let the user know that an error occured
				toast.title = "Failed to fetch the search results"
				toast.message = String(response.status)
				toast.style = Toast.Style.Failure
				throw new Error(`Failed to fetch the search page: ${response.status}`);
			}
			
			return response.json()
		}).then((data) => {
			//small bandaid so that the code doesn't implode if non-normal query is sent
			if (!Array.isArray(data)){
				// let the user know that they inputed a weird thing that broke
				toast.title = "Unrecognized output"
				toast.message = "Perhaps your query was invalid"
				toast.style = Toast.Style.Failure
				return
			}
			let typedData = data as [string,string[],string[],string[]]
			const searchResult = {} as SearchResult;
			searchResult.query = typedData[0]
			searchResult.titles = typedData[1]
			searchResult.description = typedData[2]
			searchResult.urls = typedData[3]
			setWikiSearch(searchResult)
			toast.style = Toast.Style.Success;
            toast.title = "Search complete";
		}).catch((error)=>{
			if(controller.signal.aborted){
				return

			}
			//todo catch errors sob
		})
		},200)
		return() => {
			clearTimeout(timeout)
			controller.abort()
		}
	},[searchTerm])
	
	return wikiSearch

}

export default function ArchSeek() {
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	let selectedTitle
	let wikiText = {} as SearchResult;

	wikiText = useSearchWikiPage(query)
	if (selectedId != null){
		// safety check
		if (Number(selectedId) < wikiText.titles.length) {
			selectedTitle = wikiText.titles[Number(selectedId)]
		} 
	} else {
		// if selectedId is null, just return an empty selected title
		selectedTitle = ""
	}
	const {wikiPage,isLoading:wikiPageIsLoading,revalidate:wikiPageRevalidate,error:WikiPageError} = useWikiPage(selectedTitle)

    return(
        <List isLoading={wikiPageIsLoading} searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)}>
			{query === "" && wikiText.titles.length === 0 ? (
				<List.EmptyView title="No Page found" description="Try to search something else." icon={{ source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}} />
) : (
		 wikiText.titles.map((title, index) =>
			<List.Item id={String(index)} key={title} title={title} icon="Arch_Linux_logo.svg" detail={
				<List.Item.Detail  markdown={`# ${title}\n\n`+turndownService.turndown(wikiPage)}/>
			} actions={
				<ActionPanel>
					<Action.CopyToClipboard title="Copy wiki url to clipboard" content={wikiText.urls[index]} icon={Icon.CopyClipboard}/>
					<Action.OpenInBrowser title="Open wiki page in browser" url={wikiText.urls[index]} icon="Arch_Linux_logo.svg"/>
					<Action.Push title="Open in detail" target={
						// @ts-expect-error to remove at next release when isLoading gets added
						<Detail isLoading={wikiPageIsLoading} markdown={`# ${title}\n\n`+turndownService.turndown(wikiPage)} /> } icon={Icon.AppWindow} actions={
							<ActionPanel>
								<Action onAction={wikiPageRevalidate} title="Reload page" icon={Icon.ArrowClockwise}/>
							</ActionPanel>
						}/>
				</ActionPanel>
			}/>
		) 
			)
			
		}
			</List>
	
    );
	}

