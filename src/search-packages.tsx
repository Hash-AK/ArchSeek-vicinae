// various import
import {
	Action,
	ActionPanel,
	Detail,
	Icon,
	List,
	showToast,
	Toast,
	Color,
    getPreferenceValues,
} from "@vicinae/api";
import TurndownService from "turndown"
import {
	useEffect,
	useState
} from 'react';
import { DOMParser } from '@xmldom/xmldom'
import { useFetch } from '@raycast/utils'
interface Preferences {
    "aur-helper": string;
}
interface PackageDescription{
    pkgname: string
    pkgbase: string
    repo: string
    arch: string
    pkgver: string
    pkgrel: string
    epoch: number
    pkgdesc: string
    url: string
    filename: string
    compressed_size: number
    installed_size: number
    build_date: string //for now, going to try to parse this later (TODO)
    last_update: string // same as for build_date (TODO)
    flag_date: null | string //in case it was flagged
    maintainers: string[]
    packager: string
    groups: string[]
    licenses: string[]
    conflicts: string[]
    provides: string[]
    replaces: string[]
    depends: string[]
    optdepends: string[]
    makedepends: string[]
    checkdepends: string[]
}
interface PackageSearchResult {
    version: number
    limit: number
    valid: boolean
    results: PackageDescription[]
    num_pages: number
    count: number
    page: number
}
interface AURPackageDescription{
    Description: string
    FirstSubmitted: EpochTimeStamp
    ID: number
    LastModified: EpochTimeStamp
    Maintainer: string
    Name: string
    NumVotes: number
    OutOfDate: null | EpochTimeStamp
    PackageBase: string
    PackageBaseID: number
    Popularity: number
    URL: string
    URLPath: string
    Version: string

}
interface AURPackageMoreInfoResult{ //sob
resultcount: number
results: AURPackageMoreInfoDescription[]
type: string
version: number
}
interface AURPackageMoreInfoDescription{
    CoMaintainers: string[]
    Conflicts: string[]
    Depends: string[]
    Description: string
    FirstSubmitted: EpochTimeStamp
    ID: number
    Keywords: string[]
    LastModified: EpochTimeStamp
    License: string[]
    Maintainer: string
    MakeDepends: string[]
    Name: string
    NumVotes: number
    OutOfDate: null | EpochTimeStamp
    PackageBase: string
    PackageBaseID: number
    Popularity: number
    Provides: string[]
    Submitter: string
    URL: string
    URLPath: string
    Version: string

}
interface AURSearchResult {
    resultcount: number
    results: AURPackageDescription[]
    type: string
    version: number
}
interface SearchState {
    officialResults: PackageDescription[]
    AURResults: AURPackageDescription[]
}
interface AURCommits{
    hash: string
    title: string
    date: string
    author: string
}
const defaultAurMoreInfoDescription = {CoMaintainers: [""],Conflicts: [""],Depends:[""],Description: "",FirstSubmitted:0,ID:0,Keywords:[""],LastModified:0,License:[""],Maintainer:"",MakeDepends:[""],Name:"",NumVotes:0,OutOfDate:null,PackageBase:"",PackageBaseID:0,Popularity:0,Provides:[""],Submitter:"",URL:"",URLPath:"",Version:""} as AURPackageMoreInfoDescription
const defaultOutput = {officialResults: [],AURResults: []} as SearchState
const prefs = getPreferenceValues<Preferences>();
// Turndownservice initialisation (to be able to transform html to markdown)
var turndownService = new TurndownService({codeBlockStyle: `fenced`})
turndownService.addRule('del',{
    filter: function (node){
        return(
            node.className === 'del'
        )
    },
    replacement: function (content){
        return '<span style="color:red">' + content + '</span>  \n'
    }
})
 
turndownService.addRule('add',{
    filter: function (node){
        return(
            node.className === 'add'
        )
    },
    replacement: function(content){
        return '<span style="color:green">' + content + '</span>  \n'
    }
})
turndownService.addRule('hunk',{
    filter: function (node){
        return(
            node.className === 'hunk'
        )
    },
    replacement: function (content){
        return '<span style="color:#5c5cbd">' + content + '</span>  \n'
    }
})
turndownService.addRule('head',{
    filter: function (node){
        return(
            node.className === 'head'
        )
        
    },replacement: function(content){
            return '**' + content + '**  \n'
    }
})
function useGetMoreAURInfo(packageName: string|null){
    const [info,setInfo] = useState<AURPackageMoreInfoDescription>(defaultAurMoreInfoDescription)
    useEffect(() => {
    setInfo(defaultAurMoreInfoDescription)
    const controller = new AbortController();
    if (packageName == null){
        return () => controller.abort()
    }
    if (packageName.length == 0){
        return () => controller.abort()
    }

    (async() =>{
    const toast = await showToast({ title: "Fetching package info...", style: Toast.Style.Animated})
    let urlEncodedName = encodeURIComponent(packageName)
    fetch(`https://aur.archlinux.org/rpc/v5/info?arg[]=${urlEncodedName}`,{signal: controller.signal}).then((response) =>{
        if(!response.ok){
            toast.title = "Failed to fetch package info"
            toast.message = String(response.status)
            toast.style = Toast.Style.Failure
            throw new Error(`Failed to fetch the page: ${response.status}`)
        }
        return response.json()
    }).then((data) =>{
        let typedData = data as AURPackageMoreInfoResult
        let results = typedData.results[0] as AURPackageMoreInfoDescription
        setInfo(results)
        toast.style = Toast.Style.Success
        toast.title = "Package info fetched!"
    }).catch((error)=>{
        if(controller.signal.aborted){
            return
        }
        toast.style = Toast.Style.Failure
        toast.title = "Failed to fetch package info"
        console.log(`Failed to fetch package info: ${error}`)
    })
    })()
    return () => {
        controller.abort()
    }
    },[packageName])
    return info
}
function useSearchPackage(searchTerm: string, source: string){
    const [packageSearch, setPackageSearch] = useState<SearchState>(defaultOutput)
        useEffect(() => {
        const controller = new AbortController();
        if(searchTerm.length==0){
            setPackageSearch(defaultOutput)
            return () => controller.abort()
        }

        const timeout = setTimeout(async ()=>{
        const toast = await showToast({ title: "Searching...", style: Toast.Style.Animated })
         /*   
        if(source == "All"){
            toast.hide()
            return
        }
        */
       
        if (source == "AUR"){
            //Aurweb rpc limitation
            if (searchTerm.length < 2 ){
                toast.title = "Your query must be at least 2 characters long"
                toast.style = Toast.Style.Failure
                setPackageSearch(defaultOutput)
                return () => controller.abort()
    
            }
            let urlEncodedSearchTerm = encodeURIComponent(searchTerm)
            fetch(`https://aur.archlinux.org/rpc/v5/search/${urlEncodedSearchTerm}`, {signal: controller.signal}).then((response)=> {
                if (!response.ok){
                    toast.title = "Failed to fetch the search results"
                    toast.message = String(response.status)
                    toast.style = Toast.Style.Failure
                    console.log(response.status +  " " + response.statusText)
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data)=> {
                let typedData = data as AURSearchResult
                setPackageSearch({officialResults:[], AURResults: typedData.results})
                toast.style = Toast.Style.Success;
                toast.title = "Search complete";
            }).catch((error)=>{
                if(controller.signal.aborted){
                    return;
                }
                console.log(`An error occured: ${String(error)}`)
                toast.style = Toast.Style.Failure
                toast.title = "An error occured"
                toast.message = String(error)
            })
        }
        else if (source == "Official"){
            let urlEncodedSearchTerm = encodeURIComponent(searchTerm)
            fetch(`https://archlinux.org/packages/search/json/?q=${urlEncodedSearchTerm}`, {signal: controller.signal}).then((response)=>{
                if (!response.ok){
                    toast.title = "Failed to fetch the search results"
                    toast.message = String(response.status)
                    toast.style = Toast.Style.Failure
                    throw new Error(`Failed to fetch the search page: ${response.status}`)
                }
                return response.json()
            }).then((data) => {
                let typedData = data as PackageSearchResult
                setPackageSearch({officialResults: typedData.results,AURResults:[]})
                toast.style = Toast.Style.Success;
                toast.title = "Search complete";
            }).catch((error)=>{
                if(controller.signal.aborted){
                    return;
                }
                console.log(`An error occured: ${String(error)}`)
                toast.style = Toast.Style.Failure
                toast.title = "An error occured"
                toast.message = String(error)
            })
        } 

        },400)
        return() => {
            clearTimeout(timeout)
            controller.abort()
        }

    },[searchTerm,source])


    return packageSearch
}
function useFetchPKGBUILD(packageName:string|null){
    let doWeExecute : boolean = true
    if (packageName == null){
        doWeExecute = false
    }
    if (packageName?.length == 0){
        doWeExecute = false
    }
    const {isLoading, data, revalidate,error} = useFetch<string>(`https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=${encodeURIComponent(packageName ?? "")}`,{execute:doWeExecute })
    console.log(data)
    return {
        PKGBUILD: data ?? "",
        isLoading,
        revalidate,
        error
    }
    

}
/*
function useFetchPKGBUILD(packageName:string|null){
    const [pkgText, setPkgText] = useState<string>("")


    useEffect(()=>{
    (async() =>{
    setPkgText("")
    const controller = new AbortController();
    if (packageName == null){
        return () => controller.abort()
    }
    if (packageName.length == 0){
        return () => controller.abort()
    }
        const toast = await showToast({title: "Fetching PKGBUILD",style: Toast.Style.Animated})
        const encodedPackageName = encodeURIComponent(packageName)
        fetch(`https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=${encodedPackageName}`,{signal:controller.signal}).then((response) =>{
            if (!response.ok){
                toast.style = Toast.Style.Failure
                toast.title = "Failed to fetch PKGBUILD"
                toast.message = String(response.status)
                throw new Error(`Failed to fetch PKGBUILD: ${response.status}`)
            }
            return response.text()
        }).then((data) =>{
            toast.style = Toast.Style.Success
            toast.title = "PKGBUILD fetched"
            setPkgText(data)
        }).catch((error) =>{
            if (controller.signal.aborted){
                return
            }
            toast.style = Toast.Style.Failure
            toast.title = "Failed to fetch PKGBUILD"
            console.log(`Failed to fetch the PKGBUILD: ${error}`)
        })
        return () =>{
            controller.abort()
        }
    })()
    },[packageName])
    return pkgText
}
    */
function useFetchPKGBUILDCommits(packageName:string|null){
    let doWeExecute : boolean = true
    if (packageName == null){
        doWeExecute = false
    }
    if (packageName?.length == 0){
        doWeExecute = false
    }
    const {isLoading, data, revalidate,error} = useFetch<string>(`https://aur.archlinux.org/cgit/aur.git/atom/?h=${encodeURIComponent(packageName ?? "")}`,{execute:doWeExecute})
    if (error){
        console.log(`Error: ${error}`)
    } 
        let aurCommits : AURCommits[] = []
        if (data){
        console.log(`Data XML: ${data}`)
        const xmlDoc = new DOMParser().parseFromString(String(data),"text/xml")
        let allEntrylements = xmlDoc.getElementsByTagName("entry")
        for (let i =0; i<allEntrylements.length;i++){  
                if (allEntrylements[i].hasChildNodes() === false){
                    continue
                }
                const idContent = String(allEntrylements[i].getElementsByTagName("id")[0].textContent)
                const titleContent = String(allEntrylements[i].getElementsByTagName("title")[0].textContent)
                const dateContent = String(allEntrylements[i].getElementsByTagName("published")[0].textContent)
                const authorContent = String(allEntrylements[i].getElementsByTagName("author")[0].textContent)
                aurCommits.push({hash: idContent,title:titleContent,date: dateContent,author:authorContent})
                
        

    }
}
    return {
        aurCommits: aurCommits,
        isLoading,
        revalidate,
        error
    }

}
/*
function useFetchPKGBUILDCommits(packageName:string|null){
    const [commits,setCommits] = useState<AURCommits[]>([])
    useEffect(() =>{
        (async() =>{
        const controller = new AbortController()
        if (packageName == null){
            return () => controller.abort()
            
        }
        if (packageName.length == 0){
            return () => controller.abort()
        }
        const toast = await showToast({title: "Fetching commits",style: Toast.Style.Animated})

        const encodedPackageName = encodeURIComponent(packageName)
        fetch(`https://aur.archlinux.org/cgit/aur.git/atom/?h=${encodedPackageName}`,{signal:controller.signal}).then((response)=>{
            if (!response.ok){
                console.log(response.statusText)
                toast.style = Toast.Style.Failure
                toast.title = "Failed to fetch commits"
                throw new Error(`Failed to fetch commits: ${response.status}`)
            }
            return response.text()
        }).then((data)=>{
            let aurCommits: AURCommits[] = []
            const xmlDoc = new DOMParser().parseFromString(data,"text/xml")
            let allEntrylements = xmlDoc.getElementsByTagName("entry")
            for (let i =0; i<allEntrylements.length;i++){  
                if (allEntrylements[i].hasChildNodes() === false){
                    continue
                }
                const idContent = String(allEntrylements[i].getElementsByTagName("id")[0].textContent)
                const titleContent = String(allEntrylements[i].getElementsByTagName("title")[0].textContent)
                const dateContent = String(allEntrylements[i].getElementsByTagName("published")[0].textContent)
                const authorContent = String(allEntrylements[i].getElementsByTagName("author")[0].textContent)
                aurCommits.push({hash: idContent,title:titleContent,date: dateContent,author:authorContent})
                
            }
            toast.style = Toast.Style.Success
            toast.title = "Commits fetched successfully!"
            setCommits(aurCommits)
        }).catch((error)=>{
            if(controller.signal.aborted){
                return
            }
            toast.style = Toast.Style.Failure
            toast.title = "Failed to fetch commits"
            console.log(`Failed to fetch PKGBUILD commits: ${error}`)
        })
        return () =>{
            controller.abort()
        }
    })()
    },[packageName])
    return commits
    
}
*/
function useFetchPKGBUILDDiffs(packageName:string|null,hash:string|null){
const [diffText,setDiffText] = useState<string>("Select a commit to start.")
useEffect(()=>{
    (async() =>{
    setDiffText("")
    const controller = new AbortController()
    if (packageName == null || hash == null){
        setDiffText("Select a commit to start.")
        return () => controller.abort()
    }
    if (packageName.length == 0 || hash.length == 0){
        setDiffText("Select a commit to start.")
        return () => controller.abort()
    }
    const hashRegex = hash?.match(/^urn:sha\d*:(.*)/)
    if (hashRegex == null){
        setDiffText("Select a commit to start.")
        return () => controller.abort()
    }
    const toast = await showToast({title: "Fetching diffs",style: Toast.Style.Animated})
    const urlEncodedPackageName = encodeURIComponent(packageName)
    fetch(`https://aur.archlinux.org/cgit/aur.git/commit/?h=${urlEncodedPackageName}&id=${hashRegex[1]}`,{signal:controller.signal}).then((response)=>{
        if(!response.ok){
            toast.style = Toast.Style.Failure
            toast.title = "Failed to fetch diffs"
            throw new Error(`Failed to fetch diff: ${response.status}`)
        }
        return response.text()
    }).then((data)=>{
        const htmlDoc = new DOMParser().parseFromString(data,'text/html')
        let diffObj = htmlDoc.getElementsByClassName("diff").toString()
        toast.style = Toast.Style.Success
        toast.title = "Diffs fetched!"
        setDiffText(diffObj)
    }).catch((error)=>{
        if(controller.signal.aborted){
            return
        }
        toast.style = Toast.Style.Failure
        toast.title = "Failed to fetch diffs"
        console.log(`Failed to fetch diff: ${error}`)
    })
    return () => {
        controller.abort()
    }
})()
},[packageName,hash])
return diffText
}
function ReadPKGBUILD(PKGBUILD:string|null){

    return(
        <Detail markdown={`# PKGBUILD  \n\`\`\`  \n${PKGBUILD}  \n\`\`\`\``} actions={
            <ActionPanel>
            </ActionPanel>
        }/>
    )
}
function ReadPKGBUILDDiffs({packageName} : {packageName:string|null} ){
    const {aurCommits:PKGBUILDCommits,isLoading,revalidate,error} = useFetchPKGBUILDCommits(packageName)
    const [selectedCommit, setSelectedCommit] = useState<string>("")
    let diffs = useFetchPKGBUILDDiffs(packageName,selectedCommit)
    return(
        <Detail markdown={`# ${packageName}  \n### PKGBUILD CHANGES  \n---  \n${turndownService.turndown(diffs)}`} actions={
            <ActionPanel>
                <ActionPanel.Submenu title="Select commit to compare" icon={Icon.Clock}>
                    {PKGBUILDCommits.map((elementObj,index) =>
                    <Action title={elementObj.title} icon={Icon.Git} onAction={() => {setSelectedCommit(elementObj.hash)}} key={index}/>
                    )
                    }
                </ActionPanel.Submenu>
                <Action title="Reload commits" onAction={revalidate}/>

            </ActionPanel>
        }/>
    )
}
// formatBytes taken from https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes: number){
    if (!bytes)return "0 Bytes"
    const k = 1024
    const dm = 2
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
export default function ArchSeek(){
    const [query, setQuery] = useState("");
    const [sourceDropdown,setSourceDropdown] = useState("Official")
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Make sure to reset ID if results changes
    useEffect(() =>{
        setSelectedId(null)
    },[query,sourceDropdown])

    let selectedPackage: string| null = null
    let selectedPKGBase: string | null = null
    let selectedAUR: string| null =null
    let AURPackageInfo: AURPackageMoreInfoDescription = defaultAurMoreInfoDescription

    let testText = useSearchPackage(query, sourceDropdown)
    if (selectedId != null){
        if (Number(selectedId) < testText.AURResults.length && sourceDropdown == "AUR" || Number(selectedId) < testText.officialResults.length && sourceDropdown == "Official"){
            if(sourceDropdown == "AUR"){
                selectedPackage = testText.AURResults[Number(selectedId)].Name
                selectedPKGBase = testText.AURResults[Number(selectedId)].PackageBase
                selectedAUR = selectedPackage
            } else if (sourceDropdown == "Official"){
                selectedPackage = testText.officialResults[Number(selectedId)].pkgname
            }
        } 
    } else {
        selectedPackage = ""
    }
    AURPackageInfo = useGetMoreAURInfo(selectedAUR)
    const {PKGBUILD,isLoading:isLoadingPKGBUILD,revalidate:revalidatePKGBUILD,error:PKGBUILDerror} = useFetchPKGBUILD(selectedPKGBase)
    return(
        <List searchText={query} onSearchTextChange={setQuery} isShowingDetail searchBarPlaceholder="Enter a search term to start" onSelectionChange={(id) => setSelectedId(id)} searchBarAccessory={
        <List.Dropdown tooltip="Source" value={sourceDropdown} onChange={setSourceDropdown}>
            <List.Dropdown.Item title="AUR" value="AUR"/>
            <List.Dropdown.Item title="Official repos only" value="Official"/>
        </List.Dropdown>
    }>
            {query === "" ?(
                <List.EmptyView title="No Package Found" description="Try to search something else." icon={{source: "Arch_Linux_logo.svg", tintColor: Color.SecondaryText}}/>
            ) : (
                <>
                {testText.officialResults.map((officialPackage,index) =>
                <List.Item id={String(index)} title={officialPackage.pkgname} key={`${officialPackage.pkgname}-${officialPackage.repo}-${officialPackage.arch}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${officialPackage.pkgname}  \n**Architecture:** ${officialPackage.arch}  \n**Repository:** ${officialPackage.repo}  \n**Description:** ${officialPackage.pkgdesc}  \n**Upstream URL:** ${officialPackage.url}  \n**License(s):** ${Array.isArray(officialPackage.licenses) && (officialPackage.licenses?.length) > 0 ? `${officialPackage.licenses.toString()}  \n` : ""}**Maintainers:** ${officialPackage.maintainers}  \n**Package Size:** ${formatBytes(officialPackage.compressed_size)}  \n**Installed Size:** ${formatBytes(officialPackage.installed_size)}  \n**Last Packager:** ${officialPackage.packager}  \n**Build Date:** ${new Date(officialPackage.build_date).toLocaleString()}  \n**Last Updated:** ${new Date(officialPackage.last_update).toLocaleString()}  \n${typeof officialPackage.flag_date === 'string' && officialPackage.flag_date?.length > 0 ? `<span style="color:red">_**Flagged out-of-date on:** ${new Date(officialPackage.flag_date).toLocaleDateString()}</span>_`:""}`}/>
                } accessories={[
                    { tag: {value: `${officialPackage.repo}`,color: Color.Yellow}},

                    { tag: {value: "Arch Repos",color: Color.SecondaryText}}
                ]} actions={
                    <ActionPanel>
                        <Action.RunInTerminal title="Install package" args={["/bin/bash","-c",`set -x;sudo pacman -S --needed ${officialPackage.pkgname}`]} options={{hold:true}}/>
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon="Arch_Linux_logo.svg"/>
                        <Action.CopyToClipboard title="Copy upstream url to clipboard" content={officialPackage.url} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://archlinux.org/packages/${officialPackage.repo}/${officialPackage.arch}/${officialPackage.pkgname}/`} icon={Icon.CopyClipboard}/>
                    </ActionPanel>
                }/>

                )}
                {testText.AURResults.map((AURPackage,index) => 
                <List.Item id={String(index)} title={AURPackage.Name} key={`${AURPackage.ID}`} icon="Arch_Linux_logo.svg" detail={
                    <List.Item.Detail markdown={`# ${AURPackage.Name}  \n**Package Base:** ${AURPackage.PackageBase}  \n**Description:** ${AURPackage.Description}  \n**Upstream URL:** ${AURPackage.URL}  \n${Array.isArray(AURPackageInfo?.Keywords) && (AURPackageInfo?.Keywords?.length) > 0 ?  `**Keywords:** ${AURPackageInfo.Keywords.toString()}  \n`: "" }${Array.isArray(AURPackageInfo?.License) && (AURPackageInfo?.License?.length) > 0 ? `**Licenses:** ${AURPackageInfo.License.toString()}  \n` : ""}${ Array.isArray(AURPackageInfo?.Conflicts) && (AURPackageInfo.Conflicts?.length) >0 ?`**Conflicts:** ${AURPackageInfo.Conflicts.toString()}  \n` : ""}${ Array.isArray(AURPackageInfo?.Provides)&& (AURPackageInfo?.Provides?.length) > 0 ? `**Provides:** ${AURPackageInfo.Provides.toString()}  \n` : ""}**Submitter:** ${AURPackageInfo?.Submitter}  \n**Maintainers:** ${AURPackage.Maintainer}${Array.isArray(AURPackageInfo.CoMaintainers)&&(AURPackageInfo.CoMaintainers?.length) >0 ? ` (${AURPackageInfo.CoMaintainers.toString()})` : ""}  \n**Votes:** ${AURPackage.NumVotes}  \n**Popularity:** ${AURPackage.Popularity}  \n**First Submitted:** ${new Date(AURPackage.FirstSubmitted * 1000).toLocaleString()}  \n**Last Updated:** ${new Date(AURPackage.LastModified * 1000).toLocaleString()} ${(typeof AURPackageInfo.OutOfDate === 'number') ? `  \n<span style="color:red">_**Flagged out-of-date**(${new Date(AURPackageInfo.OutOfDate * 1000).toLocaleDateString()})</span>_` : ""}`}/>
                } accessories={[
                    { tag: { value: "AUR", color: Color.Green}}
                ]} actions={
                    <ActionPanel>
                        <Action.RunInTerminal title="Install package" args={["/bin/bash","-c",`set -x;${[prefs["aur-helper"]]} -S --needed ${AURPackage.Name}`]} options={{hold:true}} />
                        <Action.OpenInBrowser title="Open package in the browser" url={`https://aur.archlinux.org/packages/${AURPackage.Name}`} icon="Arch_Linux_logo.svg"/>
                        <Action.Push title="View PKGBUILD" target={ReadPKGBUILD(PKGBUILD)} icon={Icon.NewDocument}/>
                        <Action.Push title="View PKGBUILD changes" target={<ReadPKGBUILDDiffs packageName={AURPackage.PackageBase} />} icon={Icon.Clock}/>
                        <Action.CopyToClipboard title="Copy upstream url to clipboard" content={AURPackage.URL} icon={Icon.CopyClipboard}/>
                        <Action.CopyToClipboard title="Copy package url to clipboard" content={`https://aur.archlinux.org/packages/${AURPackage.Name}`}/>
                    </ActionPanel>
                }/>
                
            )}
            

                 </>   
            )
            
            }
        </List>
    );
}